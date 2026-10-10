/*
 * Bounded helpers for the silent TURN relay migration: build/inspect the
 * relay-only configuration, inspect getStats() for actually selected pairs
 * and local candidate types, plus one shared full-evidence predicate used
 * identically by preflight recognition and verification. No secrets (URLs,
 * credentials, candidate addresses) are ever returned.
 */

export type RelayPcName = 'publisher' | 'subscriber';

export type RelayPairEvidence = {
  /** selected/nominated succeeded candidate pairs found on this PC */
  selectedPairs: number;
  /** of those, pairs whose linked local candidate is of type "relay" */
  relayPairs: number;
};

export type RelayProbeOutcome = {
  /** getStats() resolved within the per-poll timeout */
  available: boolean;
  publisher: RelayPairEvidence | null;
  subscriber: RelayPairEvidence | null;
};

/** Builds a relay-only configuration from the room's current rtcConfig. */
export function buildRelayOnlyConfig(base?: RTCConfiguration | null): RTCConfiguration {
  return {
    ...((base ?? {}) as RTCConfiguration),
    iceTransportPolicy: 'relay',
  } as RTCConfiguration;
}

/** True when the given configuration is already relay-only. */
export function isRelayOnlyConfig(config?: RTCConfiguration | null): boolean {
  return config?.iceTransportPolicy === 'relay';
}

type RawStat = {
  type?: string;
  id?: string;
  state?: string;
  selected?: boolean;
  nominated?: boolean;
  selectedCandidatePairId?: string;
  localCandidateId?: string;
  candidateType?: string;
  [key: string]: unknown;
};

type StatsIterable = { forEach: (cb: (stat: unknown) => void) => void };

/*
 * Normalize the different getStats() shapes (RTCStatsReport in the browser,
 * plain key/value maps in tests) without depending on DOM globals.
 */
function iterateStats(raw: unknown, cb: (stat: RawStat) => void): void {
  if (!raw) return;

  const iterable = raw as Partial<StatsIterable>;
  if (typeof iterable.forEach === 'function') {
    iterable.forEach((stat) => cb((stat ?? {}) as RawStat));
    return;
  }

  if (typeof raw === 'object') {
    Object.values(raw as Record<string, unknown>).forEach((stat) => {
      cb((stat ?? {}) as RawStat);
    });
  }
}

/*
 * Inspects one PC's stats report for the actual selected path. Two-pass so
 * report entry order never matters. Resolution:
 *   - transport selectedCandidatePairId available: ONLY that pair counts;
 *     stale nominated pairs on other paths are ignored.
 *   - otherwise: succeeded pairs flagged selected/nominated (older browsers
 *     that do not expose the transport id).
 */
export function inspectRelayPairsFromStats(raw: unknown): RelayPairEvidence {
  const evidence: RelayPairEvidence = { selectedPairs: 0, relayPairs: 0 };
  const localCandidates = new Map<string, string>();
  const candidatePairs: RawStat[] = [];
  // Multiple transport entries possible (per-mid); each selected id counts.
  const transportSelectedPairIds = new Set<string>();

  iterateStats(raw, (stat) => {
    if (stat.type === 'local-candidate' && typeof stat.candidateType === 'string') {
      if (typeof stat.id === 'string') localCandidates.set(stat.id, stat.candidateType);
      return;
    }

    if (
      stat.type === 'transport' &&
      typeof stat.selectedCandidatePairId === 'string' &&
      stat.selectedCandidatePairId.length > 0
    ) {
      transportSelectedPairIds.add(stat.selectedCandidatePairId);
      return;
    }

    if (stat.type === 'candidate-pair') {
      candidatePairs.push(stat);
    }
  });

  const localTypeOf = (pair: RawStat): string | undefined =>
    typeof pair.localCandidateId === 'string'
      ? localCandidates.get(pair.localCandidateId)
      : undefined;

  if (transportSelectedPairIds.size > 0) {
    // only the pairs the transports actually selected count as current; old
    // succeeded/nominated pairs on other paths are never mixed in
    for (const pair of candidatePairs) {
      if (
        typeof pair.id !== 'string' ||
        !transportSelectedPairIds.has(pair.id) ||
        pair.state !== 'succeeded'
      ) {
        continue;
      }

      evidence.selectedPairs += 1;
      if (localTypeOf(pair) === 'relay') evidence.relayPairs += 1;
    }

    return evidence;
  }

  for (const pair of candidatePairs) {
    if (pair.state !== 'succeeded') continue;
    if (pair.selected !== true && pair.nominated !== true) continue;

    evidence.selectedPairs += 1;
    if (localTypeOf(pair) === 'relay') evidence.relayPairs += 1;
  }

  return evidence;
}

/**
 * Probes both transports once. Either getter may be absent (e.g. a
 * subscriber-only client that never publishes) or may reject/never resolve;
 * a bounded timeout keeps the probe cheap and produces `available: false`.
 */
export async function probeRelayMigration(getters: {
  publisher?: () => Promise<unknown>;
  subscriber?: () => Promise<unknown>;
  timeoutMs?: number;
}): Promise<RelayProbeOutcome> {
  const outcome: RelayProbeOutcome = {
    available: false,
    publisher: null,
    subscriber: null,
  };

  const timeoutMs = getters.timeoutMs ?? 2000;

  const probe = async (name: RelayPcName, getter?: () => Promise<unknown>) => {
    if (!getter) return;

    let timeoutTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    try {
      const raw = await Promise.race([
        getter(),
        new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => reject(new Error('getStats timeout')), timeoutMs);
        }),
      ]);

      // the getter settled: never leave the race timer running behind it
      clearTimeout(timeoutTimer);

      outcome[name] = inspectRelayPairsFromStats(raw);
      outcome.available = true;
    } catch {
      clearTimeout(timeoutTimer);
      // stats unavailable: remains null and does not fail the probe
    }
  };

  await Promise.all([
    probe('publisher', getters.publisher),
    probe('subscriber', getters.subscriber),
  ]);

  return outcome;
}

/** Fully relayed only when EVERY selected pair uses a relay local candidate (mixed is not). */
export function hasFullRelayEvidence(evidence: RelayPairEvidence | null | undefined): boolean {
  if (!evidence) return false;
  return evidence.selectedPairs > 0 && evidence.relayPairs === evidence.selectedPairs;
}

/** Shared full-evidence bar for the required transports (both decisions apply the same bar). */
export function allRequiredTransportsFullyRelayed(
  outcome: RelayProbeOutcome,
  required: RelayPcName[],
): boolean {
  return required.every((name) => hasFullRelayEvidence(outcome[name]));
}

/**
 * Whitelisted error names only: `Error.name` is writable and may hold
 * arbitrary (credential-like) text, so an unknown name is reduced to a
 * generic label and never echoed raw.
 */
export const RELAY_MIGRATION_KNOWN_ERROR_NAMES: ReadonlySet<string> = new Set([
  // JS built-in error classes
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'ReferenceError',
  // DOMException names relevant to getStats/setConfiguration/restart paths
  'AbortError',
  'TimeoutError',
  'InvalidStateError',
  'NotAllowedError',
  'NotSupportedError',
  'NetworkError',
  'OperationError',
]);

/**
 * Secret-safe failure classification: never returns SDK error message text
 * (it can embed TURN URLs/credentials); only whitelisted name labels pass.
 */
export function classifyRelayMigrationFailure(error: unknown): string {
  if (error instanceof DOMException) {
    return RELAY_MIGRATION_KNOWN_ERROR_NAMES.has(error.name)
      ? `dom-exception:${error.name}`
      : 'dom-exception';
  }
  if (error instanceof Error) {
    return RELAY_MIGRATION_KNOWN_ERROR_NAMES.has(error.name)
      ? `error:${error.name}`
      : 'error:Error';
  }
  if (typeof error === 'string') return 'thrown-string';
  if (error && typeof error === 'object') {
    const name = (error as { name?: unknown }).name;
    if (typeof name === 'string' && name && RELAY_MIGRATION_KNOWN_ERROR_NAMES.has(name)) {
      return `error:${name}`;
    }
    if (typeof name === 'string' && name) return 'error:Error';
    return 'thrown-object';
  }
  return 'unknown-throw';
}

export type TurnMigrationAttemptContext = {
  /** attempt id whose validity is being checked */
  attemptId: number;
  /** attempt id currently registered (undefined = invalidated/done) */
  currentAttemptId: number | undefined;
  /** true when the SDK engine/PC manager is still the one captured at start */
  engineUnchanged: boolean;
  /** livekit ConnectionState as its string value ('connected' etc.) */
  roomState: string;
  documentHidden: boolean;
};

/**
 * Pure lifecycle guard: valid only while the attempt is still the registered
 * current one, its engine is still the room's engine, the room is fully
 * connected and the document is not hidden. Used after every awaited step,
 * before any mutation.
 */
export function isTurnMigrationAttemptValid(context: TurnMigrationAttemptContext): boolean {
  if (context.currentAttemptId === undefined) return false;
  if (context.attemptId !== context.currentAttemptId) return false;
  if (!context.engineUnchanged) return false;
  if (context.roomState !== 'connected') return false;
  if (context.documentHidden) return false;
  return true;
}

/**
 * Attempt-id lifecycle: boundaries unregister the in-flight id immediately
 * and ids are never reused, so stale async steps cannot mutate newer
 * attempts or resurrect finished ones.
 */
export type TurnMigrationAttemptLifecycle = {
  /** Registers a new in-flight attempt and returns its unique id. */
  begin: () => number;
  /** Unregisters the in-flight attempt (boundary: hidden/reconnect/disconnect/unload). */
  invalidate: () => void;
  /** The currently registered (in-flight) attempt id; undefined when none. */
  current: () => number | undefined;
  /** True only while this attempt is still the registered current one. */
  isCurrent: (attemptId: number) => boolean;
  /**
   * Completion hook for one attempt: clears the registered id ONLY when it
   * still belongs to this attempt (an old attempt's finally must never clear
   * a newer attempt's in-flight state).
   */
  release: (attemptId: number) => void;
};

export function createTurnMigrationAttemptLifecycle(): TurnMigrationAttemptLifecycle {
  let seq: number = 0;
  let currentId: number | undefined = undefined;

  return {
    begin: () => {
      seq += 1;
      currentId = seq;
      return seq;
    },
    invalidate: () => {
      // never reuse an id: stale async steps cannot resurrect their attempt
      seq += 1;
      currentId = undefined;
    },
    current: () => currentId,
    isCurrent: (attemptId) => currentId !== undefined && attemptId === currentId,
    release: (attemptId) => {
      // an old attempt's completion must never clear a newer attempt's id
      if (currentId === attemptId) {
        currentId = undefined;
      }
    },
  };
}

export type RelayMigrationVerification = {
  cancel: () => void;
};

export type RelayVerificationResult = {
  outcome: RelayProbeOutcome;
  /**
   * true only when EVERY required active transport shows a confirmed relay
   * pair. A single relay leg (publisher relayed while the subscriber stayed
   * direct) is partial evidence, not full confirmation; consumers must
   * distinguish partial/unverified outcomes in their logs.
   */
  allRequiredRelayConfirmed: boolean;
  polls: number;
};

/** Bounded verification loop; onResult fires exactly once with a single boolean outcome. */
export function startRelayVerification(options: {
  getPublisherStats?: () => Promise<unknown>;
  getSubscriberStats?: () => Promise<unknown>;
  /**
   * Transports that must show a relay pair before the loop ends early.
   * A subscriber-only client passes `['subscriber']`.
   */
  requiredTransports?: RelayPcName[];
  intervalMs?: number;
  maxPolls?: number;
  timeoutMs?: number;
  onResult: (result: RelayVerificationResult) => void;
}): RelayMigrationVerification {
  const intervalMs = options.intervalMs ?? 3000;
  const maxPolls = options.maxPolls ?? 5;
  const required = options.requiredTransports ?? ['publisher', 'subscriber'];

  let cancelled = false;
  let pollCount = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finish = (result: RelayVerificationResult) => {
    if (cancelled) return;
    cancelled = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    options.onResult(result);
  };

  const poll = async () => {
    if (cancelled) return;

    pollCount += 1;
    const outcome = await probeRelayMigration({
      publisher: options.getPublisherStats,
      subscriber: options.getSubscriberStats,
      timeoutMs: options.timeoutMs,
    });

    if (cancelled) return;

    // same full-evidence bar as the preflight recognition
    const satisfied = allRequiredTransportsFullyRelayed(outcome, required);

    if (satisfied || pollCount >= maxPolls) {
      finish({
        outcome,
        allRequiredRelayConfirmed: satisfied,
        polls: pollCount,
      });
      return;
    }

    timer = setTimeout(() => void poll(), intervalMs);
  };

  void poll();

  return {
    cancel: () => {
      if (!cancelled) {
        cancelled = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    },
  };
}
