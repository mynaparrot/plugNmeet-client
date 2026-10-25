import { afterEach, describe, expect, it, vi } from 'vitest';

// The slice graph reads `window` config and boots i18next at import time. Provide
// a minimal window and stub i18next so these reducer tests run in Node.
vi.hoisted(() => {
  const doc = { cookie: '', documentElement: { lang: 'en' } };
  const g = globalThis as Record<string, unknown>;
  g.window = {
    plugNmeetConfig: {},
    location: { href: 'http://localhost/' },
    document: doc,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    postMessage: () => {},
  };
  g.document = doc;
  // Build-time defines normally injected by Vite.
  g.IS_PRODUCTION = false;
  g.PNM_VERSION = 'test';
  g.BUILD_TIME = 0;
});

vi.mock('../../../helpers/i18n', () => ({ default: { t: (key: string) => key } }));

// The slice graph reaches `helpers/utils` through TwilioTrackProcessor, and that
// module pulls in sanitize-html, which needs a newer Node than these reducer
// tests do. Only `getConfigValue` is touched, so stub that one export away.
vi.mock('../../../helpers/utils', () => ({
  getConfigValue: (_key: string, defaultValue: unknown) => defaultValue,
}));

// Avoid booting the real app store (its slice graph warns under module resets);
// the reducer under test is imported directly below.
vi.mock('../../../store', () => ({
  store: { getState: () => ({}), dispatch: () => {} },
  useAppDispatch: () => () => {},
  useAppSelector: () => undefined,
}));

const CONFIG_KEY = 'pnm-microphone-config';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Installs a fresh in-memory sessionStorage, then loads a fresh copy of the
 * slice so its initial state hydrates from that storage.
 */
const loadSlice = async (initial: Record<string, string> = {}) => {
  vi.resetModules();
  const storage = new MemoryStorage();
  for (const [key, value] of Object.entries(initial)) {
    storage.setItem(key, value);
  }
  vi.stubGlobal('sessionStorage', storage);
  const slice = await import('../roomSettingsSlice');
  return { slice, storage };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('microphoneConfig hydration', () => {
  it('defaults to an empty preset with noise suppression on', async () => {
    const { slice } = await loadSlice();

    const state = slice.default(undefined, { type: '@@init' });
    expect(state.microphoneConfig).toEqual({ audioPreset: '', noiseSuppression: true });
  });

  it('reads the stored grouped JSON config', async () => {
    const { slice } = await loadSlice({
      [CONFIG_KEY]: JSON.stringify({ audioPreset: 'speech', noiseSuppression: true }),
    });

    const state = slice.default(undefined, { type: '@@init' });
    expect(state.microphoneConfig).toEqual({ audioPreset: 'speech', noiseSuppression: true });
  });

  it('falls back to the defaults when the JSON config is corrupt', async () => {
    const { slice } = await loadSlice({ [CONFIG_KEY]: '{not json' });

    const state = slice.default(undefined, { type: '@@init' });
    expect(state.microphoneConfig).toEqual({ audioPreset: '', noiseSuppression: true });
  });

  it('falls back to the defaults when reading storage throws', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('storage unavailable');
      },
    });
    vi.resetModules();
    const slice = await import('../roomSettingsSlice');

    const state = slice.default(undefined, { type: '@@init' });
    expect(state.microphoneConfig).toEqual({ audioPreset: '', noiseSuppression: true });
  });

  it('only enables noise suppression for a strict boolean true', async () => {
    const { slice } = await loadSlice({
      [CONFIG_KEY]: JSON.stringify({ audioPreset: 'music', noiseSuppression: 'yes' }),
    });

    const state = slice.default(undefined, { type: '@@init' });
    expect(state.microphoneConfig).toEqual({ audioPreset: 'music', noiseSuppression: false });
  });
});

describe('updateMicrophoneConfig action', () => {
  it('merges partial updates and persists the grouped config as JSON', async () => {
    const { slice, storage } = await loadSlice();

    let state = slice.default(undefined, { type: '@@init' });

    state = slice.default(state, slice.updateMicrophoneConfig({ audioPreset: 'speech' }));
    expect(state.microphoneConfig).toEqual({ audioPreset: 'speech', noiseSuppression: true });
    expect(JSON.parse(storage.getItem(CONFIG_KEY)!)).toEqual({
      audioPreset: 'speech',
      noiseSuppression: true,
    });

    state = slice.default(state, slice.updateMicrophoneConfig({ noiseSuppression: false }));
    expect(state.microphoneConfig).toEqual({ audioPreset: 'speech', noiseSuppression: false });
    expect(JSON.parse(storage.getItem(CONFIG_KEY)!)).toEqual({
      audioPreset: 'speech',
      noiseSuppression: false,
    });
  });

  it('keeps the in-memory value when the grouped write fails', async () => {
    const { slice, storage } = await loadSlice();
    const state = slice.default(undefined, { type: '@@init' });
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const next = slice.default(state, slice.updateMicrophoneConfig({ audioPreset: 'speech' }));

    // The in-memory choice still updates even though persistence failed.
    expect(next.microphoneConfig).toEqual({ audioPreset: 'speech', noiseSuppression: true });
    expect(storage.getItem(CONFIG_KEY)).toBeNull();
  });

  it('persists a disabled noise suppression but clears storage back at the defaults', async () => {
    const { slice, storage } = await loadSlice();

    let state = slice.default(undefined, { type: '@@init' });
    state = slice.default(state, slice.updateMicrophoneConfig({ noiseSuppression: false }));
    // Off is not the default anymore, so it must survive a reload.
    expect(JSON.parse(storage.getItem(CONFIG_KEY)!)).toEqual({
      audioPreset: '',
      noiseSuppression: false,
    });

    slice.default(state, slice.updateMicrophoneConfig({ audioPreset: '', noiseSuppression: true }));
    expect(storage.getItem(CONFIG_KEY)).toBeNull();
  });
});
