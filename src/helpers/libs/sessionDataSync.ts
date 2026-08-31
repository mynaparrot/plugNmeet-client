import * as Y from 'yjs';
import { gzipSync, gunzipSync } from 'fflate';

// ---------------------------------------------------------------------------
// Constants (shared by the whiteboard and notepad session-data sync paths)
// ---------------------------------------------------------------------------

/** Suffix appended to a canonical key to form its rolling-diff key. */
export const SESSION_DATA_DIFF_SUFFIX = '~d';

/** Save flush window. The first unsaved change arms a single flush timer of this length; changes made during the window ride along in the same save. Guarantees no change waits longer than this and at most one save per window. */
export const SAVE_MAX_WAIT_MS = 3_000;

/** Max age of a checkpoint before a fresh one is uploaded. */
export const CHECKPOINT_MAX_AGE_MS = 60_000;

/** A diff larger than this (gzipped bytes) triggers a checkpoint instead. */
export const CHECKPOINT_DIFF_BYTES = 256 * 1024;

/** A diff larger than this fraction of the last checkpoint's wire size triggers a checkpoint. */
export const CHECKPOINT_DIFF_RATIO = 0.25;

/** Hard cap on the gzipped wire payload; above this we skip the upload. */
export const SESSION_DATA_MAX_WIRE_BYTES = 900 * 1024;

/**
 * Whether two Yjs state vectors represent the exact same document state. Used
 * to detect a no-op save (no struct/deletion changes since the last checkpoint)
 * without relying on the byte length of `encodeStateAsUpdate` (which always
 * emits a small non-empty payload even when nothing changed).
 */
function eqStateVectors(a: Uint8Array, b: Uint8Array): boolean {
  const da = Y.decodeStateVector(a);
  const db = Y.decodeStateVector(b);
  if (da.size !== db.size) {
    return false;
  }
  for (const [client, clock] of da) {
    if (db.get(client) !== clock) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

export function diffKeyOf(key: string): string {
  return `${key}${SESSION_DATA_DIFF_SUFFIX}`;
}

export function isDiffKey(key: string): boolean {
  return key.endsWith(SESSION_DATA_DIFF_SUFFIX);
}

export function canonicalKeyOf(key: string): string {
  return isDiffKey(key)
    ? key.slice(0, key.length - SESSION_DATA_DIFF_SUFFIX.length)
    : key;
}

// ---------------------------------------------------------------------------
// gzip helpers
// ---------------------------------------------------------------------------

/** Compress a raw payload into gzip bytes. */
export function compress(input: Uint8Array): Uint8Array {
  return gzipSync(input);
}

/**
 * Decompress a gzip'd session-data payload. All session-data blobs are
 * gzip'd; input that is not valid gzip (legacy pre-gzip data or
 * corruption) throws so callers can drop it. Empty input is passed
 * through unchanged — it means "no data", not an error.
 */
export function decompress(input: Uint8Array): Uint8Array {
  if (!input || input.length === 0) {
    return input;
  }
  return gunzipSync(input);
}

// ---------------------------------------------------------------------------
// Save-decision state
// ---------------------------------------------------------------------------

export type PlanSaveResult =
  | {
      kind: 'checkpoint' | 'diff';
      update: Uint8Array;
      key: string;
      skipReason?: undefined;
    }
  | {
      kind: 'diff';
      update: Uint8Array;
      key: string;
      skipReason: 'empty-diff';
    };

export interface PlanSaveOptions {
  /** Force a full checkpoint upload (e.g. teardown flush). */
  forceCheckpoint?: boolean;
}

/**
 * Per-(fileId,page) / per-document decision state for the checkpoint +
 * rolling-diff session-data upload strategy.
 *
 * The checkpoint baseline naturally resets to `null` on first save after
 * hydration, rejoin, or presenter switch, so no explicit switch detection is
 * required: a `null` baseline always yields a full checkpoint.
 */
export class SessionDataSyncState {
  private lastCheckpointSV: Uint8Array | null = null;
  private lastCheckpointWireBytes = 0;
  private lastCheckpointAt = 0;
  private readonly nowFn: () => number;

  constructor(nowFn: () => number = Date.now) {
    this.nowFn = nowFn;
  }

  get hasCheckpoint(): boolean {
    return this.lastCheckpointSV !== null;
  }

  /**
   * Decide how to persist the current document state.
   *
   * @param doc           The live Yjs document.
   * @param canonicalKey  The canonical (non-diff) data key for this doc.
   * @param options       See {@link PlanSaveOptions}.
   */
  planSave(
    doc: Y.Doc,
    canonicalKey: string,
    options: PlanSaveOptions = {},
  ): PlanSaveResult {
    const forceCheckpoint = options.forceCheckpoint ?? false;

    // No baseline yet → full checkpoint. Also covers first-save-after-
    // hydration, rejoin and presenter switch (the SV is reset to null there).
    if (this.lastCheckpointSV === null) {
      return {
        kind: 'checkpoint',
        update: Y.encodeStateAsUpdate(doc),
        key: canonicalKey,
      };
    }

    if (forceCheckpoint) {
      return {
        kind: 'checkpoint',
        update: Y.encodeStateAsUpdate(doc),
        key: canonicalKey,
      };
    }

    // No-op save: the document has not changed since the last checkpoint.
    // Note: `encodeStateAsUpdate(doc, sv)` still emits a tiny non-empty payload
    // even when nothing changed, so we compare state vectors to detect this.
    if (eqStateVectors(Y.encodeStateVector(doc), this.lastCheckpointSV)) {
      const diff = Y.encodeStateAsUpdate(doc, this.lastCheckpointSV);
      return {
        kind: 'diff',
        update: diff,
        key: diffKeyOf(canonicalKey),
        skipReason: 'empty-diff',
      };
    }

    // Diff against the last checkpoint state vector.
    const diff = Y.encodeStateAsUpdate(doc, this.lastCheckpointSV);

    // If the gzipped diff is larger than the threshold, send a fresh
    // checkpoint instead (more compact and resets the baseline).
    const diffWireBytes = compress(diff).length;
    const sizeThreshold = Math.max(
      CHECKPOINT_DIFF_BYTES,
      CHECKPOINT_DIFF_RATIO * this.lastCheckpointWireBytes,
    );
    if (diffWireBytes > sizeThreshold) {
      return {
        kind: 'checkpoint',
        update: Y.encodeStateAsUpdate(doc),
        key: canonicalKey,
      };
    }

    // Refresh a stale checkpoint so late joiners still get a recent full state.
    if (this.nowFn() - this.lastCheckpointAt > CHECKPOINT_MAX_AGE_MS) {
      return {
        kind: 'checkpoint',
        update: Y.encodeStateAsUpdate(doc),
        key: canonicalKey,
      };
    }

    return {
      kind: 'diff',
      update: diff,
      key: diffKeyOf(canonicalKey),
    };
  }

  /**
   * Record that a checkpoint upload succeeded. MUST only be called after a
   * successful-send decision — never for oversize payloads, so the next flush
   * retries the checkpoint rather than baselining diffs against an upload the
   * server never received.
   */
  noteCheckpointUploaded(doc: Y.Doc, wireBytes: number): void {
    this.lastCheckpointSV = Y.encodeStateVector(doc);
    this.lastCheckpointWireBytes = wireBytes;
    this.lastCheckpointAt = this.nowFn();
  }

  /** Reset the baseline (e.g. on hydration of a fresh doc). */
  reset(): void {
    this.lastCheckpointSV = null;
    this.lastCheckpointWireBytes = 0;
    this.lastCheckpointAt = 0;
  }
}
