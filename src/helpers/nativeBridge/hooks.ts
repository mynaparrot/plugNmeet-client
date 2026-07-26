import { useSyncExternalStore } from 'react';
import type { NativePublisherStatus } from './subscriber';
import {
  getNativePublisherStatus,
  subscribeNativePublisherStatus,
} from './subscriber';

/** Live native publisher status (available / per-source active+muted / lastError). */
export const useNativePublisherStatus = (): NativePublisherStatus =>
  useSyncExternalStore(
    subscribeNativePublisherStatus,
    getNativePublisherStatus,
  );
