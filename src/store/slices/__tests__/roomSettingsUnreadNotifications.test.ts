import { describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

import reducer, {
  clearUnreadNotificationsCount,
  incrementUnreadNotificationsCount,
  setAllUserNotifications,
} from '../roomSettingsSlice';

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

const createTestStore = () => configureStore({ reducer: { roomSettings: reducer } });

describe('unreadNotificationsCount', () => {
  it('starts at zero', () => {
    expect(createTestStore().getState().roomSettings.unreadNotificationsCount).toBe(0);
  });

  it('increments per counted notification', () => {
    const store = createTestStore();

    store.dispatch(incrementUnreadNotificationsCount());
    store.dispatch(incrementUnreadNotificationsCount());

    expect(store.getState().roomSettings.unreadNotificationsCount).toBe(2);
  });

  it('clears back to zero', () => {
    const store = createTestStore();
    store.dispatch(incrementUnreadNotificationsCount());

    store.dispatch(clearUnreadNotificationsCount());

    expect(store.getState().roomSettings.unreadNotificationsCount).toBe(0);
  });

  it('is unaffected by restoring persisted notification history', () => {
    const store = createTestStore();

    store.dispatch(
      setAllUserNotifications([
        { message: 'restored', typeOption: 'info', created: 1, disableToastNotification: true },
      ]),
    );

    expect(store.getState().roomSettings.unreadNotificationsCount).toBe(0);
  });
});
