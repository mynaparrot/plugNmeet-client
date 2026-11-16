import { describe, expect, it, vi } from 'vitest';
import { create } from '@bufbuild/protobuf';
import { RoomMetadataSchema } from 'plugnmeet-protocol-js';

// `../breakoutRoom` also contains the auto-return flow, which pulls in the
// redux store, the RTK query api and i18n (all of which expect a browser).
// Stub those so the pure parser helper can be tested in the node environment.
vi.mock('../../../../store', () => ({
  store: { getState: () => ({}), dispatch: () => undefined },
}));
vi.mock('../../../../store/services/breakoutRoomApi', () => ({
  breakoutRoomApi: {
    endpoints: { backToMain: { initiate: () => () => ({}) } },
  },
}));
vi.mock('../../../../store/slices/roomSettingsSlice', () => ({
  addUserNotification: () => ({ type: 'test/addUserNotification' }),
}));
vi.mock('../../../../store/slices/breakoutRoomSlice', () => ({
  setReturningToMainRoom: () => ({ type: 'test/setReturningToMainRoom' }),
}));
vi.mock('../../../../helpers/i18n', () => ({
  default: { t: (key: string) => key },
}));

const { parseParentRoomId, canAccessBreakoutRooms } = await import('../breakoutRoom');

const roomMetadata = (
  breakout: { isActive?: boolean; isAllow?: boolean },
  autoCreatePerUserSession = false,
) =>
  create(RoomMetadataSchema, {
    isBreakoutRoom: false,
    roomFeatures: {
      breakoutRoomFeatures: {
        isActive: !!breakout.isActive,
        isAllow: !!breakout.isAllow,
      },
      insightsFeatures: {
        aiAgentFeatures: {
          isAllow: autoCreatePerUserSession,
          autoCreatePerUserSession,
        },
      },
    },
  });

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

describe('canAccessBreakoutRooms', () => {
  it('is available to everyone while breakout rooms are running', () => {
    const meta = roomMetadata({ isActive: true });
    expect(canAccessBreakoutRooms(meta, false)).toBe(true);
    expect(canAccessBreakoutRooms(meta, true)).toBe(true);
  });

  it('is not available to admins before rooms are started', () => {
    expect(canAccessBreakoutRooms(roomMetadata({ isAllow: true }), true)).toBe(false);
    expect(canAccessBreakoutRooms(roomMetadata({ isAllow: true }), false)).toBe(false);
  });

  it('is available to admins for per-user AI agent rooms', () => {
    const meta = roomMetadata({ isAllow: true }, true);
    expect(canAccessBreakoutRooms(meta, true)).toBe(true);
    expect(canAccessBreakoutRooms(meta, false)).toBe(false);
  });

  it('is available to admins for auto-created per-user rooms even when rooms cannot be started manually', () => {
    const meta = roomMetadata({}, true);
    expect(canAccessBreakoutRooms(meta, true)).toBe(true);
    expect(canAccessBreakoutRooms(meta, false)).toBe(false);
  });

  it('is never available inside a breakout room', () => {
    const meta = roomMetadata({ isActive: true, isAllow: true }, true);
    meta.isBreakoutRoom = true;
    expect(canAccessBreakoutRooms(meta, true)).toBe(false);
  });

  it('is not available without metadata', () => {
    expect(canAccessBreakoutRooms(undefined, true)).toBe(false);
  });
});
