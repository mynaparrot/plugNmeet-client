import { describe, expect, it, vi } from 'vitest';

import {
  buildRelayOnlyConfig,
  classifyRelayMigrationFailure,
  createTurnMigrationAttemptLifecycle,
  hasFullRelayEvidence,
  inspectRelayPairsFromStats,
  isRelayOnlyConfig,
  isTurnMigrationAttemptValid,
  allRequiredTransportsFullyRelayed,
  probeRelayMigration,
  startRelayVerification,
} from '../turnRelayMigration';

/*
 * Bounded fake stats shaped like an RTCStatsReport: candidate types only —
 * the module must never need or expose addresses/credentials.
 */
function fakeStatsReport(entries: Record<string, unknown>[]) {
  return { forEach: (cb: (stat: unknown) => void) => entries.forEach(cb) };
}

function reportWithRelayPair(relay: boolean, selected = true) {
  return fakeStatsReport([
    {
      type: 'transport',
    },
    {
      type: 'local-candidate',
      id: 'local-1',
      candidateType: relay ? 'relay' : 'host',
    },
    {
      type: 'candidate-pair',
      id: 'pair-1',
      state: 'succeeded',
      selected,
      localCandidateId: 'local-1',
    },
  ]);
}

describe('relay-only migration config helpers', () => {
  it('buildRelayOnlyConfig preserves base fields and forces relay policy', () => {
    const base = {
      iceServers: [{ urls: ['turn:example'] }],
      iceCandidatePoolSize: 2,
    };

    const config = buildRelayOnlyConfig(base);

    expect(config.iceTransportPolicy).toBe('relay');
    expect(config.iceServers).toEqual([{ urls: ['turn:example'] }]);
    expect(config.iceCandidatePoolSize).toBe(2);
    // the base object is not mutated
    expect((base as { iceTransportPolicy?: string }).iceTransportPolicy).toBeUndefined();
  });

  it('recognizes an already relay-only configuration', () => {
    expect(isRelayOnlyConfig({ iceTransportPolicy: 'relay' })).toBe(true);
    expect(isRelayOnlyConfig({ iceTransportPolicy: 'all' })).toBe(false);
    expect(isRelayOnlyConfig(undefined)).toBe(false);
    expect(isRelayOnlyConfig(null)).toBe(false);
  });
});

describe('candidate-pair evidence', () => {
  it('confirms relay only via selected succeeded pairs linked to relay local candidates', () => {
    const evidence = inspectRelayPairsFromStats(reportWithRelayPair(true));

    expect(evidence).toEqual({ selectedPairs: 1, relayPairs: 1 });
  });

  it('does not confirm relay for non-relay local candidates', () => {
    const evidence = inspectRelayPairsFromStats(reportWithRelayPair(false));

    expect(evidence).toEqual({ selectedPairs: 1, relayPairs: 0 });
  });

  it('ignores failed pairs and pairs that are neither selected nor nominated', () => {
    const evidence = inspectRelayPairsFromStats(
      fakeStatsReport([
        { type: 'local-candidate', id: 'l', candidateType: 'relay' },
        { type: 'candidate-pair', state: 'failed', selected: true, localCandidateId: 'l' },
        { type: 'candidate-pair', state: 'succeeded', selected: false, localCandidateId: 'l' },
      ]),
    );

    expect(evidence).toEqual({ selectedPairs: 0, relayPairs: 0 });
  });

  it('a nominated pair counts as the selected pair (fallback when no transport id exists)', () => {
    const evidence = inspectRelayPairsFromStats(
      fakeStatsReport([
        { type: 'local-candidate', id: 'l', candidateType: 'relay' },
        { type: 'candidate-pair', state: 'succeeded', nominated: true, localCandidateId: 'l' },
      ]),
    );

    expect(evidence).toEqual({ selectedPairs: 1, relayPairs: 1 });
  });

  it('supports plain key/value stats maps in addition to StatsReport', () => {
    const evidence = inspectRelayPairsFromStats({
      a: { type: 'local-candidate', id: 'l', candidateType: 'relay' },
      b: { type: 'candidate-pair', state: 'succeeded', selected: true, localCandidateId: 'l' },
    });

    expect(evidence).toEqual({ selectedPairs: 1, relayPairs: 1 });
  });

  it('is independent of report entry order (pair listed before its local candidate)', () => {
    const shuffled = [
      {
        type: 'candidate-pair',
        id: 'p1',
        state: 'succeeded',
        nominated: true,
        localCandidateId: 'local-2',
      },
      { type: 'transport', id: 't', selectedCandidatePairId: 'p1' },
      {
        type: 'candidate-pair',
        id: 'p0',
        state: 'succeeded',
        nominated: true,
        localCandidateId: 'local-1',
      },
      { type: 'local-candidate', id: 'local-1', candidateType: 'host' },
      { type: 'local-candidate', id: 'local-2', candidateType: 'relay' },
    ];

    const evidence = inspectRelayPairsFromStats(fakeStatsReport(shuffled));

    // transport points at p1 whose local candidate is the relay candidate
    expect(evidence).toEqual({ selectedPairs: 1, relayPairs: 1 });
  });

  it('uses the transport selectedCandidatePairId as the actual selected path when available', () => {
    const evidence = inspectRelayPairsFromStats(
      fakeStatsReport([
        { type: 'local-candidate', id: 'local-host', candidateType: 'host' },
        { type: 'local-candidate', id: 'local-relay', candidateType: 'relay' },
        {
          type: 'candidate-pair',
          id: 'pair-direct',
          state: 'succeeded',
          selected: true,
          localCandidateId: 'local-host',
        },
        {
          type: 'candidate-pair',
          id: 'pair-relay',
          state: 'succeeded',
          localCandidateId: 'local-relay',
        },
        { type: 'transport', id: 't', selectedCandidatePairId: 'pair-direct' },
      ]),
    );

    expect(evidence).toEqual({ selectedPairs: 1, relayPairs: 0 });
  });

  it('ignores stale nominated relay pairs that are no longer the selected path', () => {
    const evidence = inspectRelayPairsFromStats(
      fakeStatsReport([
        { type: 'local-candidate', id: 'local-host', candidateType: 'host' },
        { type: 'local-candidate', id: 'local-relay', candidateType: 'relay' },
        {
          // old nominated relay pair from a previous restart: no longer current
          type: 'candidate-pair',
          id: 'pair-relay-old',
          state: 'succeeded',
          nominated: true,
          localCandidateId: 'local-relay',
        },
        {
          type: 'candidate-pair',
          id: 'pair-direct',
          state: 'succeeded',
          nominated: true,
          localCandidateId: 'local-host',
        },
        { type: 'transport', id: 't', selectedCandidatePairId: 'pair-direct' },
      ]),
    );

    expect(evidence).toEqual({ selectedPairs: 1, relayPairs: 0 });
  });

  it('a selected transport pair that is not succeeded counts no evidence', () => {
    const evidence = inspectRelayPairsFromStats(
      fakeStatsReport([
        { type: 'local-candidate', id: 'l', candidateType: 'relay' },
        { type: 'candidate-pair', id: 'p', state: 'failed', localCandidateId: 'l' },
        { type: 'transport', id: 't', selectedCandidatePairId: 'p' },
      ]),
    );

    expect(evidence).toEqual({ selectedPairs: 0, relayPairs: 0 });
  });
});

describe('secret-safe failure classification', () => {
  it('classifies known whitelisted Error names', () => {
    expect(classifyRelayMigrationFailure(new TypeError('net down'))).toBe('error:TypeError');
    expect(classifyRelayMigrationFailure(new RangeError('x'))).toBe('error:RangeError');
    expect(classifyRelayMigrationFailure(new Error('plain'))).toBe('error:Error');
  });

  it('classifies known whitelisted DOMException names', () => {
    expect(classifyRelayMigrationFailure(new DOMException('boom', 'AbortError'))).toBe(
      'dom-exception:AbortError',
    );
    expect(classifyRelayMigrationFailure(new DOMException('boom', 'TimeoutError'))).toBe(
      'dom-exception:TimeoutError',
    );
  });

  it('never returns a CUSTOM Error.name: writable names with credential-like text are reduced to a generic label', () => {
    const error = new Error('connexion failed');
    // Error.name is writable: SDK/lib errors may carry arbitrary text, even
    // credential-looking strings
    error.name = 'sdkLedger_TURN_PASS_j8Kx2pQ';

    const classification = classifyRelayMigrationFailure(error);

    expect(classification).toBe('error:Error');
    expect(classification).not.toContain('TURN_PASS');
    expect(classification).not.toContain('sdkLedger');
  });

  it('never returns an unknown custom name from a plain thrown object', () => {
    const objectError = { name: 'WebRtcSdkError_public/turn/creds' };

    const classification = classifyRelayMigrationFailure(objectError);

    expect(classification).toBe('error:Error');
    expect(classification).not.toContain('WebRtcSdkError');
    expect(classification).not.toContain('creds');
  });

  it('never returns an unknown custom DOMException name', () => {
    const classification = classifyRelayMigrationFailure(
      new DOMException('boom', 'ProviderX_TURN_CREDENTIAL'),
    );

    expect(classification).toBe('dom-exception');
    expect(classification).not.toContain('ProviderX');
    expect(classification).not.toContain('TURN');
  });

  it('uses generic labels for other thrown kinds (no message text is ever echoed)', () => {
    expect(classifyRelayMigrationFailure('turn:creds-in-string')).toBe('thrown-string');
    expect(classifyRelayMigrationFailure({ nothing: 1 })).toBe('thrown-object');
    expect(classifyRelayMigrationFailure(42)).toBe('unknown-throw');
    expect(classifyRelayMigrationFailure(undefined)).toBe('unknown-throw');
  });
});

describe('attempt lifecycle (delayed probe invalidation + release)', () => {
  it('a delayed preflight probe result is discarded after a lifecycle boundary (hidden/reconnect/disconnect/unload)', () => {
    // hidden / reconnecting / disconnect / unload all go through the same
    // invalidate() call, so every one of them must invalidate the in-flight id
    ['document-hidden', 'reconnecting', 'disconnect', 'beforeunload'].forEach(() => {
      const lifecycle = createTurnMigrationAttemptLifecycle();

      // attempt starts: delayed getStats-based preflight probe is in flight
      const attemptId = lifecycle.begin();
      expect(lifecycle.isCurrent(attemptId)).toBe(true);

      // the boundary crosses the room while the probe is still awaiting
      lifecycle.invalidate();

      // the stale attempt can no longer mutate/toast/verify
      expect(lifecycle.isCurrent(attemptId)).toBe(false);
      expect(lifecycle.current()).toBeUndefined();
      expect(
        isTurnMigrationAttemptValid({
          attemptId,
          currentAttemptId: lifecycle.current(),
          engineUnchanged: true,
          roomState: 'reconnecting',
          documentHidden: false,
        }),
      ).toBe(false);

      // and its completion cannot clear anything that is not its own
      lifecycle.release(attemptId);
      expect(lifecycle.current()).toBeUndefined();
    });
  });

  it('an old attempt completion does not clear a newer attempt in-flight id', () => {
    const lifecycle = createTurnMigrationAttemptLifecycle();

    const attemptA = lifecycle.begin();

    // boundary invalidates A; a newer attempt B is started afterwards
    lifecycle.invalidate();
    const attemptB = lifecycle.begin();
    expect(attemptB).not.toBe(attemptA);
    expect(lifecycle.isCurrent(attemptB)).toBe(true);

    // A's finally runs late: it must NOT clear B's in-flight state
    lifecycle.release(attemptA);
    expect(lifecycle.isCurrent(attemptB)).toBe(true);
    expect(lifecycle.current()).toBe(attemptB);

    // B's own completion is what clears the state
    lifecycle.release(attemptB);
    expect(lifecycle.current()).toBeUndefined();
  });

  it('ids are never reused across boundaries and begin() is monotonic', () => {
    const lifecycle = createTurnMigrationAttemptLifecycle();

    const first = lifecycle.begin();
    lifecycle.invalidate();
    const second = lifecycle.begin();
    lifecycle.invalidate();
    const third = lifecycle.begin();

    expect(third).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(first);
    expect(lifecycle.isCurrent(first)).toBe(false);
    expect(lifecycle.isCurrent(second)).toBe(false);
    expect(lifecycle.isCurrent(third)).toBe(true);
  });

  it('a new attempt after a boundary can be released cleanly and the old one is inert', () => {
    const lifecycle = createTurnMigrationAttemptLifecycle();

    const stale = lifecycle.begin();
    lifecycle.invalidate();
    const fresh = lifecycle.begin();

    lifecycle.release(fresh);
    expect(lifecycle.current()).toBeUndefined();

    lifecycle.release(stale);
    expect(lifecycle.current()).toBeUndefined();
  });
});

describe('mixed selection and full-confirmation evidence', () => {
  function multiSelectedReport(pairs: { id: string; localType: string }[]) {
    return fakeStatsReport([
      { type: 'transport', id: 't', selectedCandidatePairId: pairs.map((p) => p.id)[0] },
      {
        type: 'transport',
        id: 't2',
        selectedCandidatePairId: pairs[pairs.length - 1].id,
      },
      ...pairs.map((p) => ({
        type: 'local-candidate',
        id: `${p.id}-local`,
        candidateType: p.localType,
      })),
      ...pairs.map((p) => ({
        type: 'candidate-pair',
        id: p.id,
        state: 'succeeded',
        localCandidateId: `${p.id}-local`,
      })),
    ]);
  }

  it('a MIXED active selection (one relay leg + one direct leg) on one transport is partial, never full', () => {
    const evidence = inspectRelayPairsFromStats(
      multiSelectedReport([
        { id: 'pair-relay', localType: 'relay' },
        { id: 'pair-direct', localType: 'host' },
      ]),
    );

    expect(evidence).toEqual({ selectedPairs: 2, relayPairs: 1 });
    expect(hasFullRelayEvidence(evidence)).toBe(false);
  });

  it('an active selection with EVERY selected pair relayed is full confirmation', () => {
    const evidence = inspectRelayPairsFromStats(
      multiSelectedReport([
        { id: 'pair-relay-1', localType: 'relay' },
        { id: 'pair-relay-2', localType: 'relay' },
      ]),
    );

    expect(evidence).toEqual({ selectedPairs: 2, relayPairs: 2 });
    expect(hasFullRelayEvidence(evidence)).toBe(true);
  });

  it('allRequiredTransportsFullyRelayed requires full evidence on every required transport', () => {
    const mixed = inspectRelayPairsFromStats(
      multiSelectedReport([
        { id: 'pair-relay', localType: 'relay' },
        { id: 'pair-direct', localType: 'host' },
      ]),
    );
    const full = inspectRelayPairsFromStats(reportWithRelayPair(true));

    const outcome = {
      available: true,
      publisher: mixed,
      subscriber: full,
    };

    // one mixed leg is enough to withhold confirmation
    expect(allRequiredTransportsFullyRelayed(outcome, ['publisher', 'subscriber'])).toBe(false);

    outcome.publisher = full;
    expect(allRequiredTransportsFullyRelayed(outcome, ['publisher', 'subscriber'])).toBe(true);
  });

  it('verification confirms full relay only after the selection actually turns fully relayed', async () => {
    const onResult = vi.fn();
    let publisherStatsCalls = 0;

    startRelayVerification({
      getPublisherStats: () => {
        publisherStatsCalls += 1;
        /*
         * The first two polls still show a mixed active selection (one relay
         * leg + one direct leg); afterwards the direct leg is gone and every
         * selected pair is relay on both transports.
         */
        return Promise.resolve(
          publisherStatsCalls <= 2
            ? multiSelectedReport([
                { id: 'pair-relay', localType: 'relay' },
                { id: 'pair-direct', localType: 'host' },
              ])
            : reportWithRelayPair(true),
        );
      },
      getSubscriberStats: () => Promise.resolve(reportWithRelayPair(true)),
      intervalMs: 5,
      maxPolls: 5,
      timeoutMs: 50,
      onResult,
    });

    await vi.waitFor(() => {
      expect(onResult).toHaveBeenCalledTimes(1);
    });

    const result = onResult.mock.calls[0][0];

    /*
     * Polls 1-2 (mixed selection) were NOT confirmable; poll 3 showed full
     * relay on both required transports: confirmed with polls=3 (a confirm at
     * the first poll would have had polls=1 instead).
     */
    expect(result.allRequiredRelayConfirmed).toBe(true);
    expect(result.polls).toBe(3);
    expect(publisherStatsCalls).toBe(3);
  });
});

describe('relay migration probe', () => {
  it('probes both transports and reports per-PC evidence', async () => {
    const outcome = await probeRelayMigration({
      publisher: () => Promise.resolve(reportWithRelayPair(true)),
      subscriber: () => Promise.resolve(reportWithRelayPair(true)),
      timeoutMs: 500,
    });

    expect(outcome.available).toBe(true);
    expect(outcome.publisher).toEqual({ selectedPairs: 1, relayPairs: 1 });
    expect(outcome.subscriber).toEqual({ selectedPairs: 1, relayPairs: 1 });
  });

  it('degrades gracefully when a transport has no stats or rejects', async () => {
    const outcome = await probeRelayMigration({
      publisher: () => Promise.reject(new Error('closed')),
      subscriber: () => Promise.resolve(reportWithRelayPair(true)),
      timeoutMs: 500,
    });

    expect(outcome.available).toBe(true);
    expect(outcome.publisher).toBeNull();
    expect(outcome.subscriber).toEqual({ selectedPairs: 1, relayPairs: 1 });
  });

  it('stays bounded when getStats never resolves', async () => {
    const missing = { relayPairs: 0, selectedPairs: 0 };
    const outcome = await probeRelayMigration({
      publisher: () => new Promise(() => undefined),
      subscriber: () => Promise.resolve(reportWithRelayPair(true)),
      timeoutMs: 100,
    });

    expect(outcome.available).toBe(true);
    expect(outcome.publisher).toBeNull();
    expect(outcome.subscriber).not.toBeNull();
    expect(outcome.subscriber).not.toEqual(missing);
  });

  it('subscriber-only client: missing publisher getter yields null publisher evidence', async () => {
    const outcome = await probeRelayMigration({
      subscriber: () => Promise.resolve(reportWithRelayPair(true)),
      timeoutMs: 500,
    });

    expect(outcome.publisher).toBeNull();
    expect(outcome.subscriber).toEqual({ selectedPairs: 1, relayPairs: 1 });
  });
});

describe('bounded verification lifecycle', () => {
  it('finishes early once all required transports show relay pairs', async () => {
    const onResult = vi.fn();

    const verification = startRelayVerification({
      getPublisherStats: () => Promise.resolve(reportWithRelayPair(true)),
      getSubscriberStats: () => Promise.resolve(reportWithRelayPair(true)),
      intervalMs: 10,
      maxPolls: 5,
      timeoutMs: 50,
      onResult,
    });

    await vi.waitFor(() => {
      expect(onResult).toHaveBeenCalledTimes(1);
    });

    const result = onResult.mock.calls[0][0];
    expect(result.polls).toBe(1);
    expect(result.allRequiredRelayConfirmed).toBe(true);
    expect(verification.cancel).toBeTypeOf('function');
  });

  it('exhausts the poll budget and reports unconfirmed evidence exactly once', async () => {
    const onResult = vi.fn();

    startRelayVerification({
      getPublisherStats: () => Promise.resolve(reportWithRelayPair(false)),
      getSubscriberStats: () => Promise.resolve(reportWithRelayPair(false)),
      intervalMs: 5,
      maxPolls: 3,
      timeoutMs: 100,
      onResult,
    });

    await vi.waitFor(
      () => {
        expect(onResult).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );

    const result = onResult.mock.calls[0][0];
    expect(result.polls).toBe(3);
    expect(result.allRequiredRelayConfirmed).toBe(false);
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it('subscriber-only verification requires only subscriber evidence', async () => {
    const onResult = vi.fn();

    startRelayVerification({
      getSubscriberStats: () => Promise.resolve(reportWithRelayPair(true)),
      requiredTransports: ['subscriber'],
      intervalMs: 10,
      maxPolls: 5,
      timeoutMs: 50,
      onResult,
    });

    await vi.waitFor(() => {
      expect(onResult).toHaveBeenCalledTimes(1);
    });

    const result = onResult.mock.calls[0][0];
    expect(result.allRequiredRelayConfirmed).toBe(true);
    expect(result.outcome.publisher).toBeNull();
  });

  it('reports a partial outcome when only one required transport shows relay pairs', async () => {
    const onResult = vi.fn();

    startRelayVerification({
      getPublisherStats: () => Promise.resolve(reportWithRelayPair(true)),
      getSubscriberStats: () => Promise.resolve(reportWithRelayPair(false)),
      intervalMs: 10,
      maxPolls: 5,
      timeoutMs: 50,
      onResult,
    });

    await vi.waitFor(() => {
      expect(onResult).toHaveBeenCalledTimes(1);
    });

    const result = onResult.mock.calls[0][0];
    expect(result.allRequiredRelayConfirmed).toBe(false);
  });

  it('cancel() stops the loop before reporting', async () => {
    const onResult = vi.fn();

    const verification = startRelayVerification({
      getPublisherStats: () => Promise.resolve(reportWithRelayPair(false)),
      intervalMs: 10,
      maxPolls: 5,
      timeoutMs: 100,
      onResult,
    });

    verification.cancel();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onResult).not.toHaveBeenCalled();
  });
});
