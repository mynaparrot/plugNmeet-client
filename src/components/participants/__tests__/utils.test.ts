import { afterEach, describe, expect, it, vi } from 'vitest';

// `utils` also imports the app store, NATS and i18n, which need a browser
// environment, so only the pure helpers and the announcement payload are under
// test here.
const { sendChatMsg } = vi.hoisted(() => ({ sendChatMsg: vi.fn() }));

vi.mock('../../../store', () => ({ store: { getState: () => ({}), dispatch: () => {} } }));
vi.mock('../../../store/slices/participantSlice', () => ({ selectVisibleParticipants: () => [] }));
vi.mock('../../../helpers/i18n', () => ({
  default: {
    // Mirrors the real template: the name placeholder sits at the end.
    t: (key: string, opts?: { name?: string }) =>
      opts?.name === undefined ? key : `${key}: selected ${opts.name}`,
  },
}));
vi.mock('../../../helpers/nats', () => ({ getNatsConn: () => ({ sendChatMsg }) }));

import { announceSelection, randomIndexBelow } from '../utils';

const stubValues = (...values: number[]) => {
  const queue = [...values];
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
    (arr as Uint32Array)[0] = queue.shift() ?? 0;
    return arr;
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('randomIndexBelow', () => {
  it('always returns 0 when only one item is possible', () => {
    expect(randomIndexBelow(1)).toBe(0);
  });

  it('stays within range', () => {
    for (let i = 0; i < 500; i += 1) {
      const index = randomIndexBelow(7);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(7);
    }
  });

  it('rejects values in the biased tail and draws again', () => {
    // 4294967295 is not a multiple of 3, so the top value is rejected.
    const spy = stubValues(0xffffffff, 9);
    expect(randomIndexBelow(3)).toBe(0);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('maps accepted values with a plain modulo', () => {
    stubValues(8);
    expect(randomIndexBelow(4)).toBe(0);
    stubValues(11);
    expect(randomIndexBelow(4)).toBe(3);
  });

  it('rejects invalid input', () => {
    expect(() => randomIndexBelow(0)).toThrow();
    expect(() => randomIndexBelow(-2)).toThrow();
    expect(() => randomIndexBelow(2.5)).toThrow();
  });
});

describe('announceSelection', () => {
  it('sends the announcement to the public chat', async () => {
    await announceSelection('Rafiq');

    expect(sendChatMsg).toHaveBeenCalledTimes(1);
    const [chatOption, message] = sendChatMsg.mock.calls[0];
    expect(chatOption).toBe('public');
    // The localized sentence stays on line one; the name gets its own bold line.
    expect(message).toBe(
      '<span class="block text-xs font-medium text-Gray-600 dark:text-dark-text">left-panel.picker.announcement: selected<strong class="block font-bold">Rafiq</strong></span>',
    );
    expect(message).not.toContain('selected Rafiq');
  });

  it('escapes markup in participant names', async () => {
    await announceSelection('<img src=x onerror=alert(1)>');

    const message = sendChatMsg.mock.calls[0][1];
    expect(message).not.toContain('<img');
    expect(message).toContain(
      '<strong class="block font-bold">&lt;img src=x onerror=alert(1)&gt;</strong>',
    );
  });
});
