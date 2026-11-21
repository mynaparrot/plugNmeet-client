import { describe, expect, it, vi } from 'vitest';

// Parts of the import graph read `window` while they load.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    plugNmeetConfig: {},
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    localStorage: { getItem: () => null, setItem: () => undefined },
    navigator: { userAgent: 'node' },
  };
});

vi.mock('../i18n', () => ({ default: { t: (key: string) => key, language: 'en' } }));
vi.mock('../../store', () => ({ store: { getState: () => ({}), dispatch: vi.fn() } }));
vi.mock('../../store/slices/participantSlice', () => ({
  participantsSelector: { selectAll: () => [] },
}));

import { isInternalParticipant } from '../utils';

describe('isInternalParticipant', () => {
  it('recognises the synthetic participants b-server creates', () => {
    for (const userId of [
      'RECORDER_BOT',
      'RTMP_BOT',
      'pnm_agent-ai_agent-1',
      'pnm_tts_agent-1',
      'pnm_agent_ai_agent-1', // legacy underscore form
    ]) {
      expect(isInternalParticipant(userId)).toBe(true);
    }
  });

  it('keeps real participants and near-miss ids', () => {
    for (const userId of ['user-1', 'pnm_agent', 'agent', 'pnm_tts_agent', '', undefined]) {
      expect(isInternalParticipant(userId)).toBe(false);
    }
  });
});
