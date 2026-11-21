import { describe, expect, it, vi } from 'vitest';
import { create } from '@bufbuild/protobuf';
import { AIAgentSessionMode, RoomMetadataSchema } from 'plugnmeet-protocol-js';
import en from '../../../../assets/locales/en/translation.json';

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

const {
  parseParentRoomId,
  canAccessBreakoutRooms,
  canLeaveBreakoutRoom,
  canReturnToMainRoom,
  getEndActionUi,
  isAgenticSessionsMode,
} = await import('../breakoutRoom');

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

// Breakout child metadata as the server writes it: only the per-user AI session
// marker decides the learner's way back, never the room's own return flags.
const breakoutMetadata = (isPerUserAiSession: boolean, allowReturnToMainRoom = true) =>
  create(RoomMetadataSchema, {
    isBreakoutRoom: true,
    roomFeatures: {
      breakoutRoomFeatures: { isPerUserAiSession, allowReturnToMainRoom },
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

  it('is available to admins for controlled AI agent rooms with several allowed users', () => {
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

  it('is available to admins for controlled AI agent rooms with a single allowed user', () => {
    // a 1-user controlled room still routes its learner to an agentic room
    const meta = roomMetadata(
      { isAllow: true },
      {
        isAllow: true,
        sessionMode: AIAgentSessionMode.AI_AGENT_SESSION_MODE_CONTROLLED_USERS,
        allowedParticipantIds: ['student-1'],
      },
    );
    expect(canAccessBreakoutRooms(meta, true)).toBe(true);
    expect(canAccessBreakoutRooms(meta, false)).toBe(false);
  });

  it('is not treated as a per-user room for normal rooms or a roster-less controlled room', () => {
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
            allowedParticipantIds: [],
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

describe('canLeaveBreakoutRoom', () => {
  it('is false outside a breakout room', () => {
    expect(canLeaveBreakoutRoom(roomMetadata({}))).toBe(false);
    expect(canLeaveBreakoutRoom(undefined)).toBe(false);
  });

  it('is false for admins, who keep their own end-room controls', () => {
    expect(canLeaveBreakoutRoom(breakoutMetadata(true), true)).toBe(false);
  });

  it('is true for the learner of a 1-on-1 AI session room', () => {
    expect(canLeaveBreakoutRoom(breakoutMetadata(true))).toBe(true);
  });

  it('is false for a learner who is returned to the main room when the room ends', () => {
    expect(canLeaveBreakoutRoom(breakoutMetadata(false))).toBe(false);
    // an AI breakout room of a normal session that forbids returning still
    // returns its learner once it ends, so no leave control is needed
    expect(canLeaveBreakoutRoom(breakoutMetadata(false, false))).toBe(false);
  });
});

describe('canReturnToMainRoom', () => {
  it('is false outside a breakout room', () => {
    expect(canReturnToMainRoom(roomMetadata({}))).toBe(false);
    expect(canReturnToMainRoom(undefined)).toBe(false);
  });

  it('is true for an admin, who always returns to their own main room', () => {
    // an admin only observes a 1-on-1 AI session room and never ends up there
    expect(canReturnToMainRoom(breakoutMetadata(true), true)).toBe(true);
    expect(canReturnToMainRoom(breakoutMetadata(false), true)).toBe(true);
  });

  it('is false for the learner of a 1-on-1 AI session room', () => {
    expect(canReturnToMainRoom(breakoutMetadata(true))).toBe(false);
  });

  it('is true for an AI breakout room of a normal session that forbids returning', () => {
    // regression: a normal-session AI breakout room keeps allowReturnToMainRoom
    // false for the host's sake, but it is not a 1-on-1 AI session room
    const meta = breakoutMetadata(false, false);
    expect(canReturnToMainRoom(meta)).toBe(true);
    expect(canLeaveBreakoutRoom(meta)).toBe(false);
  });

  it('is true for every other breakout room', () => {
    expect(canReturnToMainRoom(breakoutMetadata(false))).toBe(true);
  });
});

describe('getEndActionUi', () => {
  const leaveCopy = {
    footerLabelKey: 'header.menus.logout',
    menuLabelKey: 'header.menus.logout',
    titleKey: 'header.menus.alert.confirm',
    textKey: 'header.menus.alert.logout',
  };

  it('keeps the plain leave wording for a learner in a normal room', () => {
    expect(getEndActionUi(roomMetadata({}))).toEqual(leaveCopy);
    expect(getEndActionUi(undefined)).toEqual(leaveCopy);
  });

  it('offers the admin end option outside breakout rooms', () => {
    expect(getEndActionUi(roomMetadata({}), true)).toEqual({
      ...leaveCopy,
      footerLabelKey: 'header.menus.end',
    });
  });

  it('keeps the plain leave wording for a learner returned from a normal breakout room', () => {
    expect(getEndActionUi(breakoutMetadata(false))).toEqual(leaveCopy);
    expect(getEndActionUi(breakoutMetadata(false, false))).toEqual(leaveCopy);
  });

  it('lets the observing admin fall back to their own end wording in a 1-on-1 room', () => {
    // an admin only observes someone else's session and returns to the main
    // room instead, so they never see the learner's end-session copy
    expect(getEndActionUi(breakoutMetadata(true), true)).toEqual({
      ...leaveCopy,
      footerLabelKey: 'header.menus.end',
    });
  });

  it('turns the learner action of a 1-on-1 AI session room into ending the session', () => {
    expect(getEndActionUi(breakoutMetadata(true))).toEqual({
      footerLabelKey: 'header.menus.end-ai-session',
      menuLabelKey: 'header.menus.end-ai-session',
      titleKey: 'header.menus.alert.end-ai-session-title',
      textKey: 'header.menus.alert.end-ai-session',
    });
  });

  it('uses translation keys that exist in the English locale', () => {
    const lookup = (key: string) =>
      key
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown> | undefined)?.[part],
          en as unknown,
        );

    const contexts: Array<[ReturnType<typeof roomMetadata> | undefined, boolean]> = [
      [roomMetadata({}), false],
      [roomMetadata({}), true],
      [breakoutMetadata(false), false],
      [breakoutMetadata(true), true],
      [breakoutMetadata(true), false],
    ];
    for (const [meta, admin] of contexts) {
      const ui = getEndActionUi(meta, admin);
      for (const key of Object.values(ui)) {
        expect(lookup(key), key).toEqual(expect.any(String));
        expect(lookup(key), key).not.toBe('');
      }
    }
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
