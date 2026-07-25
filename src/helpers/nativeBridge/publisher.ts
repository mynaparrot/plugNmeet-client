import { create } from '@bufbuild/protobuf';
import {
  NativeBridgeActions,
  NativeBridgeE2EESchema,
  NativeBridgeHeartbeatSchema,
  NativeBridgeInitializePublisherSchema,
  NativeBridgeMediaSourceSchema,
  NativeBridgeMsgSchema,
  NativeMediaSource,
  type NativeBridgeMsg,
} from 'plugnmeet-protocol-js';

import { nativeBridge, nativeBridgeEventName } from './bridge';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
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

const emptySources = (): Record<NativeMediaSource, NativeSourceStatus> => ({
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

const emit = (next: Partial<NativePublisherStatus>) => {
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

const on = (
  action: NativeBridgeActions,
  cb: (msg: NativeBridgeMsg) => void,
) => {
  window.addEventListener(nativeBridgeEventName(action), ((
    e: CustomEvent<NativeBridgeMsg>,
  ) => cb(e.detail)) as EventListener);
};

// ---- native -> web status tracking (registered once at module load) ----
on(NativeBridgeActions.NATIVE_TRACK_PUBLISHED, (msg) => {
  if (msg.payload.case === 'trackState') {
    setSource(msg.payload.value.source, { active: true, muted: false });
  }
});

on(NativeBridgeActions.NATIVE_TRACK_UNPUBLISHED, (msg) => {
  if (msg.payload.case === 'trackState') {
    setSource(msg.payload.value.source, { active: false, muted: false });
  }
});

on(NativeBridgeActions.NATIVE_MEDIA_MUTED, (msg) => {
  if (msg.payload.case === 'mediaMuted') {
    setSource(msg.payload.value.source, { muted: msg.payload.value.muted });
  }
});

on(NativeBridgeActions.NATIVE_MEDIA_STATUS, (msg) => {
  if (msg.payload.case === 'mediaStatus' && msg.payload.value.error) {
    emit({ lastError: msg.payload.value.error });
  }
});

on(NativeBridgeActions.NATIVE_ERROR, (msg) => {
  if (msg.payload.case === 'error') {
    const error = msg.payload.value;
    console.error(
      'NativeBridge error:',
      error.msg,
      error.context ? `(Context: ${error.context})` : '',
    );
    store.dispatch(
      addUserNotification({
        message: i18n.t('notifications.native-bridge-error', {
          error: error.msg,
        }),
        typeOption: 'error',
      }),
    );
  }
});

// ---- outbound helpers ----
const send = (
  action: NativeBridgeActions,
  payload?: NativeBridgeMsg['payload'],
): void => {
  nativeBridge.send(
    create(NativeBridgeMsgSchema, payload ? { action, payload } : { action }),
  );
};

/** (Handshake) provide the native host with its LiveKit credentials. */
export const initializeNativePublisher = (
  livekitUrl: string,
  token: string,
  nativeUserId: string,
  e2ee?: { enabled: boolean; key?: string },
): void =>
  send(NativeBridgeActions.INITIALIZE_NATIVE_PUBLISHER, {
    case: 'initializeNativePublisher',
    value: create(
      NativeBridgeInitializePublisherSchema,
      e2ee
        ? {
            livekitUrl,
            token,
            nativeUserId,
            e2ee: create(NativeBridgeE2EESchema, e2ee),
          }
        : { livekitUrl, token, nativeUserId },
    ),
  });

export const publishNativeMedia = (source: NativeMediaSource): void =>
  send(NativeBridgeActions.PUBLISH_NATIVE_MEDIA, {
    case: 'mediaSource',
    value: create(NativeBridgeMediaSourceSchema, { source }),
  });

export const unpublishNativeMedia = (source: NativeMediaSource): void =>
  send(NativeBridgeActions.UNPUBLISH_NATIVE_MEDIA, {
    case: 'mediaSource',
    value: create(NativeBridgeMediaSourceSchema, { source }),
  });

export const muteNativeMedia = (source: NativeMediaSource): void =>
  send(NativeBridgeActions.MUTE_NATIVE_MEDIA, {
    case: 'mediaSource',
    value: create(NativeBridgeMediaSourceSchema, { source }),
  });

export const unmuteNativeMedia = (source: NativeMediaSource): void =>
  send(NativeBridgeActions.UNMUTE_NATIVE_MEDIA, {
    case: 'mediaSource',
    value: create(NativeBridgeMediaSourceSchema, { source }),
  });

export const teardownNativePublisher = (): void => {
  stopNativeHeartbeat();
  send(NativeBridgeActions.TEARDOWN_NATIVE_PUBLISHER);
  emit({ sources: emptySources(), available: true, lastError: undefined });
};

// ---- heartbeat (doc 4.3) ----
const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 30_000;

let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let lastPongAt = 0;

on(NativeBridgeActions.NATIVE_HEARTBEAT_PONG, () => {
  lastPongAt = Date.now();
  if (!status.available) {
    emit({ available: true });
  }
});

export const startNativeHeartbeat = (): void => {
  if (heartbeatTimer) {
    return;
  }
  lastPongAt = Date.now();
  heartbeatTimer = setInterval(() => {
    send(NativeBridgeActions.NATIVE_HEARTBEAT_PING, {
      case: 'heartbeat',
      value: create(NativeBridgeHeartbeatSchema, { ts: Date.now().toString() }),
    });
    const alive = Date.now() - lastPongAt <= HEARTBEAT_TIMEOUT_MS;
    if (alive !== status.available) {
      emit({ available: alive });
    }
  }, HEARTBEAT_INTERVAL_MS);
};

export const stopNativeHeartbeat = (): void => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
};
