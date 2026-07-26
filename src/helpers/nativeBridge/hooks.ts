import { useSyncExternalStore } from 'react';
import type { NativePublisherStatus } from './publisher';
import {
  getNativePublisherStatus,
  subscribeNativePublisherStatus,
} from './publisher';

/** Live native publisher status (available / per-source active+muted / lastError). */
export const useNativePublisherStatus = (): NativePublisherStatus =>
  useSyncExternalStore(
    subscribeNativePublisherStatus,
    getNativePublisherStatus,
  );
