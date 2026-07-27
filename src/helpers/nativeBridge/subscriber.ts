import {
  NativeBridgeActions,
  NativeMediaSource,
  type NativeBridgeMsg,
} from 'plugnmeet-protocol-js';

import { NATIVE_BRIDGE_EVENT } from './bridge';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import {
  updateIsActiveMicrophone,
  updateIsActiveScreenshare,
  updateIsActiveWebcam,
  updateIsMicMuted,
  updateIsWebcamMuted,
} from '../../store/slices/bottomIconsActivitySlice';
import { updateScreenSharing } from '../../store/slices/sessionSlice';
import { updateLastPongAt } from './heartbeat';
import i18n from '../i18n';

export interface NativePublisherStatus {
  /** false when heartbeat pongs stopped (native host gone/frozen) */
  available: boolean;
  lastError?: string;
}

let status: NativePublisherStatus = {
  available: true,
};
const listeners = new Set<() => void>();

/** Update status and notify all subscribers. Internal — only publisher/heartbeat should call this. */
export const emit = (next: Partial<NativePublisherStatus>) => {
  status = {
    ...status,
    ...next,
  };
  listeners.forEach((l) => l());
};

export const getNativePublisherStatus = (): NativePublisherStatus => status;

export const subscribeNativePublisherStatus = (
  fn: () => void,
): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Sync native media source lifecycle into Redux (single source of truth for UI). */
const syncSourceToRedux = (
  source: NativeMediaSource,
  active: boolean,
  muted: boolean,
) => {
  switch (source) {
    case NativeMediaSource.MIC:
      store.dispatch(updateIsActiveMicrophone(active));
      store.dispatch(updateIsMicMuted(active ? muted : false));
      break;
    case NativeMediaSource.WEBCAM:
      store.dispatch(updateIsActiveWebcam(active));
      // Hybrid keeps the track published while muted; web uses empty-stream instead.
      store.dispatch(updateIsWebcamMuted(active ? muted : false));
      break;
    case NativeMediaSource.SCREENSHARE: {
      store.dispatch(updateIsActiveScreenshare(active));
      const userId = store.getState().session.currentUser?.userId ?? '';
      store.dispatch(
        updateScreenSharing({
          isActive: active,
          sharedBy: active ? userId : '',
        }),
      );
      break;
    }
    default:
      break;
  }
};

// ---- native -> web status tracking (registered once at module load) ----
window.addEventListener(NATIVE_BRIDGE_EVENT, ((
  e: CustomEvent<NativeBridgeMsg>,
) => {
  const msg = e.detail;
  switch (msg.action) {
    case NativeBridgeActions.NATIVE_HEARTBEAT_PONG:
      updateLastPongAt();
      if (!status.available) {
        emit({ available: true });
      }
      break;

    case NativeBridgeActions.NATIVE_TRACK_PUBLISHED:
      if (msg.payload.case === 'trackState') {
        syncSourceToRedux(msg.payload.value.source, true, false);
      }
      break;

    case NativeBridgeActions.NATIVE_TRACK_UNPUBLISHED:
      if (msg.payload.case === 'trackState') {
        syncSourceToRedux(msg.payload.value.source, false, false);
      }
      break;

    case NativeBridgeActions.NATIVE_MEDIA_MUTED:
      if (msg.payload.case === 'mediaMuted') {
        const { source, muted } = msg.payload.value;
        // Mute only applies while the source is considered active in Redux.
        if (source === NativeMediaSource.MIC) {
          if (store.getState().bottomIconsActivity.isActiveMicrophone) {
            store.dispatch(updateIsMicMuted(muted));
          }
        } else if (source === NativeMediaSource.WEBCAM) {
          if (store.getState().bottomIconsActivity.isActiveWebcam) {
            store.dispatch(updateIsWebcamMuted(muted));
          }
        }
      }
      break;

    case NativeBridgeActions.NATIVE_MEDIA_STATUS:
      if (msg.payload.case === 'mediaStatus' && msg.payload.value.error) {
        emit({ lastError: msg.payload.value.error });
      }
      break;

    case NativeBridgeActions.NATIVE_ERROR:
      if (msg.payload.case === 'error') {
        console.error(
          'NativeBridge error:',
          msg.payload.value.msg,
          msg.payload.value.context
            ? `(Context: ${msg.payload.value.context})`
            : '',
        );
        store.dispatch(
          addUserNotification({
            message: i18n.t('notifications.native-bridge-error', {
              error: msg.payload.value.msg,
            }),
            typeOption: 'error',
          }),
        );
      }
      break;
  }
}) as EventListener);
