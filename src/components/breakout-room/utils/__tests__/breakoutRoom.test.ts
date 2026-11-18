import { describe, expect, it, vi } from 'vitest';
import { create } from '@bufbuild/protobuf';
import { AIAgentSessionMode, RoomMetadataSchema } from 'plugnmeet-protocol-js';

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

const { parseParentRoomId, canAccessBreakoutRooms, isAgenticSessionsMode } =
  await import('../breakoutRoom');

const roomMetadata = (
  breakout: { isActive?: boolean; isAllow?: boolean },
  aiAgent: {
    isAllow?: boolean;
    sessionMode?: AIAgentSessionMode;
    allowedParticipantIds?: string[];
  } = {},
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
          isAllow: !!aiAgent.isAllow,
          sessionMode: aiAgent.sessionMode ?? AIAgentSessionMode.AI_AGENT_SESSION_MODE_NORMAL_ROOM,
          autoSessionConfig: {
            allowedParticipantIds: aiAgent.allowedParticipantIds ?? [],
            maxConcurrentSessions: 0,
          },
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

  it('is available to admins for open-per-user AI agent rooms', () => {
    const meta = roomMetadata(
      { isAllow: true },
      { isAllow: true, sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER },
    );
    expect(canAccessBreakoutRooms(meta, true)).toBe(true);
    expect(canAccessBreakoutRooms(meta, false)).toBe(false);
  });

  it('is available to admins for controlled AI agent rooms with more than one allowed user', () => {
    const meta = roomMetadata(
      { isAllow: true },
      {
        isAllow: true,
        sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS,
        allowedParticipantIds: ['student-1', 'student-2'],
      },
    );
    expect(canAccessBreakoutRooms(meta, true)).toBe(true);
    expect(canAccessBreakoutRooms(meta, false)).toBe(false);
  });

  it('is not treated as a per-user room for normal rooms or a single controlled user', () => {
    expect(
      canAccessBreakoutRooms(
        roomMetadata(
          { isAllow: true },
          { isAllow: true, sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_NORMAL_ROOM },
        ),
        true,
      ),
    ).toBe(false);
    expect(
      canAccessBreakoutRooms(
        roomMetadata(
          { isAllow: true },
          {
            isAllow: true,
            sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS,
            allowedParticipantIds: ['student-1'],
          },
        ),
        true,
      ),
    ).toBe(false);
  });

  it('is available to admins for auto-created per-user rooms even when rooms cannot be started manually', () => {
    const meta = roomMetadata(
      {},
      { isAllow: true, sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER },
    );
    expect(canAccessBreakoutRooms(meta, true)).toBe(true);
    expect(canAccessBreakoutRooms(meta, false)).toBe(false);
  });

  it('is never available inside a breakout room', () => {
    const meta = roomMetadata(
      { isActive: true, isAllow: true },
      { isAllow: true, sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER },
    );
    meta.isBreakoutRoom = true;
    expect(canAccessBreakoutRooms(meta, true)).toBe(false);
  });

  it('is not available without metadata', () => {
    expect(canAccessBreakoutRooms(undefined, true)).toBe(false);
  });
});

describe('isAgenticSessionsMode', () => {
  const perUserMeta = () =>
    roomMetadata(
      {},
      { isAllow: true, sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_OPEN_PER_USER },
    );
  const normalMeta = () =>
    roomMetadata(
      {},
      { isAllow: true, sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_NORMAL_ROOM },
    );

  it('is true when the room itself runs per-user AI sessions', () => {
    expect(isAgenticSessionsMode(perUserMeta(), [])).toBe(true);
    expect(isAgenticSessionsMode(perUserMeta(), undefined)).toBe(true);
  });

  it('is true when every running room has the AI agent enabled', () => {
    expect(
      isAgenticSessionsMode(normalMeta(), [{ enableAiAgent: true }, { enableAiAgent: true }]),
    ).toBe(true);
  });

  it('is false for mixed or empty room lists', () => {
    expect(isAgenticSessionsMode(normalMeta(), [{ enableAiAgent: true }, {}])).toBe(false);
    expect(
      isAgenticSessionsMode(normalMeta(), [{ enableAiAgent: true }, { enableAiAgent: false }]),
    ).toBe(false);
    expect(isAgenticSessionsMode(normalMeta(), [])).toBe(false);
    expect(isAgenticSessionsMode(normalMeta(), undefined)).toBe(false);
  });

  it('is false without metadata or rooms', () => {
    expect(isAgenticSessionsMode(undefined, undefined)).toBe(false);
    expect(isAgenticSessionsMode(undefined, [])).toBe(false);
  });
});
