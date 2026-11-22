import { describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

import reducer, {
  setActiveSidePanel,
  updateIsActiveSharedNotePad,
  updateIsSharedNotepadDocked,
} from '../bottomIconsActivitySlice';

// Same minimal environment as the other slice tests: the slice graph reads
// `window` config and boots i18next at import time.
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
  g.IS_PRODUCTION = false;
  g.PNM_VERSION = 'test';
  g.BUILD_TIME = 0;
});

vi.mock('../../../helpers/i18n', () => ({ default: { t: (key: string) => key } }));

vi.mock('../../../helpers/utils', () => ({
  getConfigValue: (_key: string, defaultValue: unknown) => defaultValue,
}));

vi.mock('../../../store', () => ({
  store: { getState: () => ({}), dispatch: () => {} },
  useAppDispatch: () => () => {},
  useAppSelector: () => undefined,
}));

const createTestStore = () => configureStore({ reducer: { bottomIconsActivity: reducer } });

describe('shared notepad side panel slot', () => {
  it('opens the panel when a docked pad becomes active', () => {
    const store = createTestStore();

    store.dispatch(updateIsSharedNotepadDocked(true));
    store.dispatch(updateIsActiveSharedNotePad(true));

    expect(store.getState().bottomIconsActivity.activeSidePanel).toBe('SHARED_NOTEPAD');
  });

  it('leaves the panel alone when a floating pad becomes active', () => {
    const store = createTestStore();
    store.dispatch(setActiveSidePanel('CHAT'));

    store.dispatch(updateIsActiveSharedNotePad(true));

    expect(store.getState().bottomIconsActivity.activeSidePanel).toBe('CHAT');
  });

  it('closes the panel when the pad is closed from it', () => {
    const store = createTestStore();
    store.dispatch(updateIsSharedNotepadDocked(true));
    store.dispatch(updateIsActiveSharedNotePad(true));

    store.dispatch(updateIsActiveSharedNotePad(false));

    expect(store.getState().bottomIconsActivity.activeSidePanel).toBeNull();
  });

  it('keeps another panel open when the pad is closed', () => {
    const store = createTestStore();
    store.dispatch(updateIsActiveSharedNotePad(true));
    store.dispatch(setActiveSidePanel('CHAT'));

    store.dispatch(updateIsActiveSharedNotePad(false));

    expect(store.getState().bottomIconsActivity.activeSidePanel).toBe('CHAT');
  });

  it('does not steal the panel back on a repeated open', () => {
    const store = createTestStore();
    store.dispatch(updateIsSharedNotepadDocked(true));
    store.dispatch(updateIsActiveSharedNotePad(true));
    store.dispatch(setActiveSidePanel(null));

    store.dispatch(updateIsActiveSharedNotePad(true));

    expect(store.getState().bottomIconsActivity.activeSidePanel).toBeNull();
  });

  it('docking an open pad selects its panel, undocking releases it', () => {
    const store = createTestStore();
    store.dispatch(updateIsActiveSharedNotePad(true));

    store.dispatch(updateIsSharedNotepadDocked(true));
    expect(store.getState().bottomIconsActivity.activeSidePanel).toBe('SHARED_NOTEPAD');

    store.dispatch(updateIsSharedNotepadDocked(false));
    expect(store.getState().bottomIconsActivity.activeSidePanel).toBeNull();
  });
});
