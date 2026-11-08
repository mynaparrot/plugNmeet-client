import { describe, expect, test, vi } from 'vitest';

// helpers/utils pulls in browser-only modules (i18n, idb, native bridge) that
// touch `window` at import time. The node test env has no DOM, so give them a
// no-op shim. Unknown members resolve to a no-op function.
vi.hoisted(() => {
  const base: Record<string, unknown> = { location: { search: '' }, plugNmeetConfig: {} };
  (globalThis as any).window = new Proxy(base, {
    get: (target, prop) => (prop in target ? target[prop as string] : () => undefined),
  });
});
vi.mock('../../i18n', () => ({ default: { exists: () => false, t: (key: string) => key } }));

import { findTranslationKey } from '../../utils';

const knownKeys = new Set(['notifications.you-are-blocked', 'notifications.user-not-active']);
const hasTranslation = (key: string) => knownKeys.has(key);

describe('findTranslationKey', () => {
  test('returns a bare translation key', () => {
    expect(findTranslationKey('notifications.you-are-blocked', hasTranslation)).toBe(
      'notifications.you-are-blocked',
    );
  });

  test('finds a key wrapped by the nats server', () => {
    expect(
      findTranslationKey(
        "-ERR 'Authorization Violation: notifications.user-not-active'",
        hasTranslation,
      ),
    ).toBe('notifications.user-not-active');
  });

  test('ignores text without a known key', () => {
    expect(
      findTranslationKey('NatsError: connection refused 127.0.0.1:4222', hasTranslation),
    ).toBeUndefined();
    expect(findTranslationKey('Authorization Violation', hasTranslation)).toBeUndefined();
  });
});
