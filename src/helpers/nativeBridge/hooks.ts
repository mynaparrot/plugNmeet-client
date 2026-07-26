import { useEffect, useSyncExternalStore } from 'react';
import type {
  NativeBridgeActions,
  NativeBridgeMsg,
} from 'plugnmeet-protocol-js';

import { nativeBridgeEventName } from './bridge';
import {
  getNativePublisherStatus,
  subscribeNativePublisherStatus,
  type NativePublisherStatus,
} from './publisher';

/** Subscribe to a native -> web bridge action. */
export const useNativeBridgeEvent = (
  action: NativeBridgeActions,
  callback: (msg: NativeBridgeMsg) => void,
): void => {
  useEffect(() => {
    const eventName = nativeBridgeEventName(action);
    const handler = (e: Event) =>
      callback((e as CustomEvent<NativeBridgeMsg>).detail);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [action, callback]);
};

/** Live native publisher status (available / per-source active+muted / lastError). */
export const useNativePublisherStatus = (): NativePublisherStatus =>
  useSyncExternalStore(
    subscribeNativePublisherStatus,
    getNativePublisherStatus,
  );
