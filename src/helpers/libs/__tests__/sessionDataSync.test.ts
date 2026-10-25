import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { SessionDataSyncState, diffKeyOf } from '../sessionDataSync';

const makeDoc = () => {
  const doc = new Y.Doc();
  return { doc, map: doc.getMap<string>('elements') };
};

describe('SessionDataSyncState', () => {
  it('baselines the state vector captured at plan time', () => {
    const { doc, map } = makeDoc();
    map.set('a', '{}');
    const state = new SessionDataSyncState(() => 0);

    const plan = state.planSave(doc, 'file1_1');
    expect(plan.kind).toBe('checkpoint');
    expect(plan.stateVector).toBeTruthy();

    // An edit lands while the checkpoint upload is still in flight: it must not
    // be part of the baseline the ack records.
    map.set('b', '{}');
    state.noteCheckpointUploaded(plan.stateVector!, 100);

    const next = state.planSave(doc, 'file1_1');
    expect(next.kind).toBe('diff');
    expect(next.key).toBe(diffKeyOf('file1_1'));

    // Checkpoint + diff reproduce the doc.
    const base = new Y.Doc();
    Y.applyUpdate(base, plan.update);
    Y.applyUpdate(base, next.update);
    expect([...base.getMap<string>('elements').keys()].sort()).toEqual(['a', 'b']);
  });

  it('skips an unchanged document instead of sending an empty diff', () => {
    const { doc, map } = makeDoc();
    map.set('a', '{}');
    const state = new SessionDataSyncState(() => 0);
    const plan = state.planSave(doc, 'file1_1');
    state.noteCheckpointUploaded(plan.stateVector!, 100);

    expect(state.planSave(doc, 'file1_1').skipReason).toBe('empty-diff');
  });

  it('falls back to a checkpoint when the baseline is unset', () => {
    const { doc, map } = makeDoc();
    map.set('a', '{}');
    const state = new SessionDataSyncState(() => 0);
    state.reset();

    expect(state.hasCheckpoint).toBe(false);
    expect(state.planSave(doc, 'file1_1').kind).toBe('checkpoint');
  });
});
