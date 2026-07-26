import {
  NativeBridgeActions,
  NativeMediaSource,
  type NativeBridgeMsg,
} from 'plugnmeet-protocol-js';

import { NATIVE_BRIDGE_EVENT } from './bridge';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { updateLastPongAt } from './heartbeat';
import i18n from '../i18n';

export interface NativeSourceStatus {
  active: boolean;
  muted: boolean;
}

export interface NativePublisherStatus {
  /** false when heartbeat pongs stopped (native host gone/frozen) */
  available: boolean;
  lastError?: string;
  sources: Record<NativeMediaSource, NativeSourceStatus>;
}

export const emptySources = (): Record<
  NativeMediaSource,
  NativeSourceStatus
> => ({
  [NativeMediaSource.NATIVE_MEDIA_SOURCE_UNSPECIFIED]: {
    active: false,
    muted: false,
  },
  [NativeMediaSource.MIC]: { active: false, muted: false },
  [NativeMediaSource.WEBCAM]: { active: false, muted: false },
  [NativeMediaSource.SCREENSHARE]: { active: false, muted: false },
});

let status: NativePublisherStatus = {
  available: true,
  sources: emptySources(),
};
const listeners = new Set<() => void>();

/** Update status and notify all subscribers. Internal — only publisher.ts should call this. */
export const emit = (next: Partial<NativePublisherStatus>) => {
  status = {
    ...status,
    ...next,
    sources: next.sources ?? { ...status.sources },
  };
  listeners.forEach((l) => l());
};

const setSource = (
  source: NativeMediaSource,
  patch: Partial<NativeSourceStatus>,
) => {
  emit({
    sources: {
      ...status.sources,
      [source]: { ...status.sources[source], ...patch },
    },
  });
};

export const getNativePublisherStatus = (): NativePublisherStatus => status;

export const subscribeNativePublisherStatus = (
  fn: () => void,
): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
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
        setSource(msg.payload.value.source, { active: true, muted: false });
      }
      break;

    case NativeBridgeActions.NATIVE_TRACK_UNPUBLISHED:
      if (msg.payload.case === 'trackState') {
        setSource(msg.payload.value.source, { active: false, muted: false });
      }
      break;

    case NativeBridgeActions.NATIVE_MEDIA_MUTED:
      if (msg.payload.case === 'mediaMuted') {
        setSource(msg.payload.value.source, { muted: msg.payload.value.muted });
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
