import { describe, expect, it } from 'vitest';

import { canSendPublicChatMessage } from '../chatPermissions';

const base = { isRecorder: false, isAdmin: false };

describe('canSendPublicChatMessage', () => {
  it('never allows recorders, even when admin', () => {
    expect(canSendPublicChatMessage({ ...base, isRecorder: true, isAdmin: true })).toBe(false);
  });

  it('always allows admins', () => {
    expect(
      canSendPublicChatMessage({
        ...base,
        isAdmin: true,
        lockChat: true,
        lockChatSendMessage: true,
        defaultLockSettings: { lockChat: true, lockChatSendMessage: true },
      }),
    ).toBe(true);
  });

  it('allows regular users when nothing is locked', () => {
    expect(canSendPublicChatMessage(base)).toBe(true);
  });

  it('falls back to the room defaults', () => {
    expect(canSendPublicChatMessage({ ...base, defaultLockSettings: { lockChat: true } })).toBe(
      false,
    );
    expect(
      canSendPublicChatMessage({ ...base, defaultLockSettings: { lockChatSendMessage: true } }),
    ).toBe(false);
  });

  it('prefers the user-specific override over the room default', () => {
    expect(
      canSendPublicChatMessage({
        ...base,
        lockChat: false,
        lockChatSendMessage: false,
        defaultLockSettings: { lockChat: true, lockChatSendMessage: true },
      }),
    ).toBe(true);

    expect(
      canSendPublicChatMessage({
        ...base,
        lockChatSendMessage: true,
        defaultLockSettings: { lockChatSendMessage: false },
      }),
    ).toBe(false);
  });
});
