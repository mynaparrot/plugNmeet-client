import * as Y from 'yjs';
import { create, toJsonString } from '@bufbuild/protobuf';
import {
  BreakoutRoom,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  SessionDataHeaderSchema,
  SessionDataType,
  WhiteboardShare,
} from 'plugnmeet-protocol-js';

import { getNatsConn } from '../../../helpers/nats';
import {
  compress,
  SESSION_DATA_MAX_WIRE_BYTES,
} from '../../../helpers/libs/sessionDataSync';
import {
  deriveRoomKey,
  encryptDataToUint8ArrayWithKey,
} from '../../../helpers/libs/cryptoMessages';
import { getWhiteboardController } from '../../whiteboard/collab';
import { loadWhiteboardPageSnapshot } from '../../whiteboard/collab/whiteboardPersistence';
import { getNotepadController } from '../../shared-notepad/NotepadController';
import { store } from '../../../store';

/**
 * Client-mediated breakout content seeding.
 *
 * After breakout rooms are created with a whiteboard/notepad share, the creating
 * admin's client copies the parent's session-data content into every child room's
 * Redis hash. Each child room has the SAME E2EE secret (copied in its metadata)
 * but a DIFFERENT room sid, so a distinct PBKDF2-derived key is used per child.
 *
 * The content is written in EXACTLY the wire format the child's hydrate path
 * (`WhiteboardController`/`NotepadController` `sync(..., { hydrate: true })` ↔
 * `SESSION_DATA_FETCH_RESPONSE`) consumes:
 *   - a gzip'd full `Y.encodeStateAsUpdate(doc)` (i.e. a canonical checkpoint),
 *   - keyed by the same canonical key the child fetches:
 *       whiteboard: `${fileId}_${page}`   (see WhiteboardController.pageKey)
 *       notepad:    BREAKOUT_SEED_NOTEPAD_KEY  ('snapshot')
 *   - optionally AES-GCM encrypted with the child's derived key when E2EE is on,
 *   - addressed to the child room via `targetRoomId` (child's full room id).
 */

/** Canonical notepad session-data key (mirrors NotepadController.NOTEPAD_SNAPSHOT_KEY). */
export const BREAKOUT_SEED_NOTEPAD_KEY = 'snapshot';

/** Whiteboard canonical checkpoint key: `${fileId}_${page}`. */
const whiteboardPageKey = (fileId: string, page: number): string =>
  `${fileId}_${page}`;

/** Valid whiteboard share = fileId + at least one page. */
export const hasWhiteboardShare = (share?: WhiteboardShare | null): boolean =>
  !!share &&
  !!share.fileId &&
  Array.isArray(share.pages) &&
  share.pages.length > 0;

export interface BreakoutSeedingInput {
  /** Created child rooms (from the create-with-share response). */
  rooms: BreakoutRoom[];
  /** Whiteboard share request that was sent (may be undefined when not sharing). */
  whiteboardShare?: WhiteboardShare | null;
  /** Whether the notepad was requested to be shared. */
  shareNotepad: boolean;
}

export interface BreakoutSeedingResult {
  /** Number of child rooms that received all intended content. */
  shared: number;
  /** Total number of created child rooms. */
  total: number;
  /** True when a notepad share was requested but skipped (no local notepad doc). */
  notepadSkipped: boolean;
}

/**
 * Resolve the E2EE secret reused to derive each child room's key. Breakout child
 * rooms copy the parent's `endToEndEncryptionFeatures.encryptionKey` into their
 * own metadata, so the same secret (with a different sid salt) yields each
 * child's key — mirroring ConnectNats.initializeMediaServer's secret source.
 */
function getE2EESecret(): string | undefined {
  const e2ee =
    store.getState().session.currentRoom.metadata?.roomFeatures
      ?.endToEndEncryptionFeatures;
  if (!e2ee?.isEnabled) {
    return undefined;
  }
  // Self-insert E2EE: each participant types their own secret locally and it is
  // cleared immediately after the media-server connect, so it is never present
  // in room metadata (the metadata encryptionKey is typically empty too). Child
  // participants also re-insert their own key, so per-child seeding cannot work.
  // The UI already disables sharing in this mode; bail out so we never seed with
  // a stale/empty secret.
  if (e2ee.enabledSelfInsertEncryptionKey) {
    console.warn(
      '[breakoutRoomSeeding] self-insert E2EE is enabled; content seeding is not supported',
    );
    return undefined;
  }
  const secret = e2ee.encryptionKey;
  return secret && secret.length > 0 ? secret : undefined;
}

/**
 * Get the full Yjs state update bytes for a single whiteboard page.
 *
 * - If the page is the admin's currently mounted page, encode the live doc
 *   directly (exact, no server round-trip).
 * - Otherwise backfill the page from the parent server into IndexedDB
 *   (`fetchSessionData` resolves once the canonical checkpoint is stored) and
 *   read the raw bytes back. A blank page (no canonical checkpoint on the
 *   parent) yields `null`, meaning the child will simply start blank — correct.
 */
async function getWhiteboardPageUpdate(
  fileId: string,
  page: number,
): Promise<Uint8Array | null> {
  const controller = getWhiteboardController();
  const snapshot = controller.getSnapshot();
  if (snapshot?.doc && snapshot.fileId === fileId && snapshot.page === page) {
    return Y.encodeStateAsUpdate(snapshot.doc);
  }

  const key = whiteboardPageKey(fileId, page);
  const ok = await controller.fetchSessionData(key);
  if (!ok) {
    // A false result means the fetch timed out (or there is no NATS connection)
    // — a real failure, not a blank page. Surface it so seeding reports the
    // room as partial/failed rather than over-reporting success.
    throw new Error(
      `[breakoutRoomSeeding] failed to fetch whiteboard session data for ${key}`,
    );
  }
  const stored = await loadWhiteboardPageSnapshot(fileId, page);
  return stored && stored.length > 0 ? stored : null;
}

type NatsConn = NonNullable<ReturnType<typeof getNatsConn>>;

/**
 * Publish a single session-data entry to a child room. Mirrors the publish half
 * of `WhiteboardController.uploadSessionData`/`NotepadController.uploadSessionData`
 * but bypasses the controllers' PARENT singleton-key encryption: `value` is
 * already encrypted (with the explicit child key) by the caller when E2EE is on.
 */
function publishSessionData(
  conn: NatsConn,
  dataType: SessionDataType,
  key: string,
  value: Uint8Array,
  targetRoomId: string,
): void {
  conn.sendMessageToCoreWorker(
    create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
      msg: toJsonString(
        SessionDataHeaderSchema,
        create(SessionDataHeaderSchema, {
          dataType,
          key,
          targetRoomId,
        }),
      ),
      binMsg: value,
    }),
  );
}

/** Seed one child room; resolves true when all intended uploads succeeded. */
async function seedOneRoom(
  conn: NatsConn,
  room: BreakoutRoom,
  input: BreakoutSeedingInput,
  childKey: CryptoKey | undefined,
): Promise<boolean> {
  const targetRoomId = room.id;
  if (!targetRoomId || !room.roomSid) {
    return false;
  }

  let roomOk = true;

  const share = input.whiteboardShare;
  if (
    share &&
    share.fileId &&
    Array.isArray(share.pages) &&
    share.pages.length > 0
  ) {
    for (const page of share.pages) {
      let bytes: Uint8Array | null = null;
      try {
        bytes = await getWhiteboardPageUpdate(share.fileId, page);
      } catch (e) {
        console.error(
          '[breakoutRoomSeeding] failed to read whiteboard page',
          share.fileId,
          page,
          e,
        );
        roomOk = false;
        continue;
      }
      if (!bytes) {
        // Blank page on the parent: nothing to seed; the child starts blank.
        continue;
      }
      const wire = compress(bytes);
      if (wire.length > SESSION_DATA_MAX_WIRE_BYTES) {
        console.warn(
          `[breakoutRoomSeeding] whiteboard page ${share.fileId}_${page} too large to seed`,
        );
        roomOk = false;
        continue;
      }
      try {
        const value = childKey
          ? await encryptDataToUint8ArrayWithKey(wire, childKey)
          : wire;
        publishSessionData(
          conn,
          SessionDataType.WHITEBOARD,
          whiteboardPageKey(share.fileId, page),
          value,
          targetRoomId,
        );
      } catch (e) {
        console.error(
          '[breakoutRoomSeeding] failed to seed whiteboard page',
          share.fileId,
          page,
          e,
        );
        roomOk = false;
      }
    }
  }

  if (input.shareNotepad) {
    const doc = getNotepadController().getSnapshot().doc;
    if (!doc) {
      // Notepad doc is only alive while the notepad panel is (or was) open in
      // this client. Rather than build a parallel fetch/intercept path, skip the
      // notepad share and let the caller surface a warning toast. The room still
      // counts as shared if its whiteboard content was seeded.
      return roomOk;
    }
    try {
      const wire = compress(Y.encodeStateAsUpdate(doc));
      if (wire.length > SESSION_DATA_MAX_WIRE_BYTES) {
        console.warn(
          '[breakoutRoomSeeding] notepad snapshot too large to seed',
        );
        roomOk = false;
      } else {
        const value = childKey
          ? await encryptDataToUint8ArrayWithKey(wire, childKey)
          : wire;
        publishSessionData(
          conn,
          SessionDataType.NOTEPAD,
          BREAKOUT_SEED_NOTEPAD_KEY,
          value,
          targetRoomId,
        );
      }
    } catch (e) {
      console.error('[breakoutRoomSeeding] failed to seed notepad', e);
      roomOk = false;
    }
  }

  return roomOk;
}

/**
 * Seed whiteboard/notepad content from the parent room into every created
 * breakout child room. Fire-and-forget safe: never throws, never mutates the
 * parent's live state. Returns counts for UX feedback.
 */
export async function seedBreakoutContent(
  input: BreakoutSeedingInput,
): Promise<BreakoutSeedingResult> {
  const result: BreakoutSeedingResult = {
    shared: 0,
    total: input.rooms.length,
    notepadSkipped: false,
  };

  const hasWhiteboard = hasWhiteboardShare(input.whiteboardShare);
  const hasNotepad = input.shareNotepad;
  if (!hasWhiteboard && !hasNotepad) {
    return result;
  }

  const conn = getNatsConn();
  if (!conn) {
    return result;
  }

  // Derive the per-child key ONCE per child (expensive PBKDF2). When E2EE is
  // disabled we upload raw bytes with targetRoomId (no key work).
  let childKeyFor:
    ((roomSid: string) => Promise<CryptoKey | undefined>) | null = null;
  if (conn.enableE2EE) {
    const secret = getE2EESecret();
    if (!secret) {
      console.warn(
        '[breakoutRoomSeeding] E2EE is enabled but no shared secret is available; cannot seed encrypted content',
      );
      return result;
    }
    childKeyFor = async (roomSid: string) => deriveRoomKey(secret, roomSid);
  }

  const notepadDocMissing =
    hasNotepad && !getNotepadController().getSnapshot().doc;

  for (const room of input.rooms) {
    let childKey: CryptoKey | undefined;
    if (childKeyFor) {
      try {
        childKey = await childKeyFor(room.roomSid);
      } catch (e) {
        console.error(
          '[breakoutRoomSeeding] failed to derive child key',
          room.roomSid,
          e,
        );
      }
    }
    const ok = await seedOneRoom(conn, room, input, childKey);
    if (ok) {
      result.shared += 1;
    }
  }

  result.notepadSkipped = notepadDocMissing;
  return result;
}
