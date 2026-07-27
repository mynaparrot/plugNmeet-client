import { useSyncExternalStore } from 'react';
import {
  getNativePublisherStatus,
  subscribeNativePublisherStatus,
} from './subscriber';

/** Whether the native publisher host is alive (heartbeat). Hybrid-only concern. */
export const useNativePublisherAvailable = (): boolean =>
  useSyncExternalStore(
    subscribeNativePublisherStatus,
    () => getNativePublisherStatus().available,
  );
