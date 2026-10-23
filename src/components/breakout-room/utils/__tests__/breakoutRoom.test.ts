import { describe, expect, it, vi } from 'vitest';

// `../breakoutRoom` also contains the auto-return flow, which pulls in the
// redux store, the RTK query api and i18n (all of which expect a browser).
// Stub those so the pure parser helper can be tested in the node environment.
vi.mock('../../../../store', () => ({
  store: { getState: () => ({}), dispatch: () => undefined },
}));
vi.mock('../../../../store/services/breakoutRoomApi', () => ({
  breakoutRoomApi: { endpoints: { backToMain: { initiate: () => () => ({}) } } },
}));
vi.mock('../../../../store/slices/roomSettingsSlice', () => ({
  addUserNotification: () => ({ type: 'test/addUserNotification' }),
}));
vi.mock('../../../../store/slices/breakoutRoomSlice', () => ({
  setReturningToMainRoom: () => ({ type: 'test/setReturningToMainRoom' }),
}));
vi.mock('../../../../helpers/i18n', () => ({ default: { t: (key: string) => key } }));

const { parseParentRoomId } = await import('../breakoutRoom');

describe('parseParentRoomId', () => {
  it('returns the plain room id from a composite reference', () => {
    expect(parseParentRoomId('parent-room:42')).toBe('parent-room');
  });

  it('returns an empty string when there is no reference', () => {
    expect(parseParentRoomId('')).toBe('');
    expect(parseParentRoomId(undefined)).toBe('');
  });

  it('rejects a plain (non-composite) value instead of using it as a key', () => {
    expect(parseParentRoomId('parent-room')).toBe('');
  });

  it('rejects references with an invalid table id suffix', () => {
    expect(parseParentRoomId('parent-room:')).toBe('');
    expect(parseParentRoomId('parent-room:0')).toBe('');
    expect(parseParentRoomId('parent-room:abc')).toBe('');
    expect(parseParentRoomId('parent-room:-1')).toBe('');
    expect(parseParentRoomId(':42')).toBe('');
  });
});
