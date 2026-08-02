import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { store, useAppSelector } from '../../store';
import {
  getNativePublisherStatus,
  subscribeNativePublisherStatus,
  type NativePublisherStatus,
} from './subscriber';
import { isHybridMode } from './hybridMode';
import { muteNativeMedia, unpublishNativeMedia } from './publisher';

/** Native publisher status (liveness via heartbeat + last error). Hybrid-only concern. */
export const useNativePublisherStatus = (): NativePublisherStatus =>
  useSyncExternalStore(
    subscribeNativePublisherStatus,
    getNativePublisherStatus,
  );

/**
 * Forwards lock-settings changes to the native host via the bridge.
 * Mounted once at the app level so it fires even when individual footer
 * media icons are unmounted (e.g. allowWebcams=false).
 * No-op in standard (non-hybrid) mode.
 */
export const useHybridLockForwarder = (): void => {
  // defaultLockSettings only matter at initialization time, so read them once.
  // Runtime changes must not retroactively affect already-joined users, who may
  // have individual lock overrides.
  const { defaultLockMic, defaultLockWebcam, defaultLockScreenshare } =
    useMemo(() => {
      const defaultLockSettings =
        store.getState().session.currentRoom?.metadata?.defaultLockSettings;
      return {
        defaultLockMic: !!defaultLockSettings?.lockMicrophone,
        defaultLockWebcam: !!defaultLockSettings?.lockWebcam,
        defaultLockScreenshare: !!defaultLockSettings?.lockScreenSharing,
      };
    }, []);

  const isAdmin = useAppSelector(
    (state) => !!state.session.currentUser?.metadata?.isAdmin,
  );
  const isMicLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const isWebcamLock = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWebcam,
  );
  const isScreenshareLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockScreenSharing,
  );

  // Resolve effective lock
  const micLocked = !isAdmin && (isMicLock ?? defaultLockMic);
  const webcamLocked = !isAdmin && (isWebcamLock ?? defaultLockWebcam);
  const screenshareLocked =
    !isAdmin && (isScreenshareLock ?? defaultLockScreenshare);

  useEffect(() => {
    if (!isHybridMode()) return;
    if (micLocked) muteNativeMedia(NativeMediaSource.MIC);
  }, [micLocked]);

  useEffect(() => {
    if (!isHybridMode()) return;
    if (webcamLocked) unpublishNativeMedia(NativeMediaSource.WEBCAM);
  }, [webcamLocked]);

  useEffect(() => {
    if (!isHybridMode()) return;
    if (screenshareLocked) unpublishNativeMedia(NativeMediaSource.SCREENSHARE);
  }, [screenshareLocked]);
};
