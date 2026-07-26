import { create } from '@bufbuild/protobuf';
import {
  NativeBridgeActions,
  NativeBridgeE2EESchema,
  NativeBridgeInitializePublisherSchema,
  NativeBridgeMediaSourceSchema,
  NativeBridgeMsgSchema,
  NativeMediaSource,
  type NativeBridgeMsg,
  NativeBridgeHeartbeatSchema,
} from 'plugnmeet-protocol-js';

import { nativeBridge } from './bridge';
import { emit, emptySources } from './subscriber';
import { stopNativeHeartbeat } from './heartbeat';

// ---- outbound messages ----
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

export const sendHeartbeatPing = (): void =>
  send(NativeBridgeActions.NATIVE_HEARTBEAT_PING, {
    case: 'heartbeat',
    value: create(NativeBridgeHeartbeatSchema, {
      ts: Date.now().toString(),
    }),
  });

export const teardownNativePublisher = (): void => {
  stopNativeHeartbeat();
  send(NativeBridgeActions.TEARDOWN_NATIVE_PUBLISHER);
  emit({ sources: emptySources(), available: true, lastError: undefined });
};
