import {
  NativeBridgeActions,
  NativeBridgeMsgSchema,
  type NativeBridgeMsg,
} from 'plugnmeet-protocol-js';
import {
  fromJson,
  toJsonString,
  type JsonValue,
  fromJsonString,
} from '@bufbuild/protobuf';

/**
 * Inbound messages are re-dispatched as prefixed CustomEvents so multiple
 * listeners never conflict: `pnm-native-bridge:<ACTION_NAME>`.
 */
const EVENT_PREFIX = 'pnm-native-bridge:';

/** action enum value -> enum name (e.g. 20 -> "NATIVE_MEDIA_STATUS") */
const actionNames = new Map<number, string>();
for (const [name, value] of Object.entries(NativeBridgeActions)) {
  if (typeof value === 'number') {
    actionNames.set(value, name);
  }
}

export const nativeBridgeEventName = (action: NativeBridgeActions): string =>
  `${EVENT_PREFIX}${actionNames.get(action) ?? action}`;

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    webkit?: {
      messageHandlers?: Record<string, { postMessage: (msg: string) => void }>;
    };
    PnmNative?: { postMessage: (msg: string) => void };
  }
}

class NativeBridge {
  constructor() {
    // RN WebView delivers messages on `document`; others on `window`.
    window.addEventListener('message', this.onMessage, false);
    document.addEventListener('message', this.onMessage, false);
  }

  private onMessage = (event: Event): void => {
    const data = (event as MessageEvent).data;
    const msg = NativeBridge.parse(data);
    if (!msg) {
      return; // foreign message on the bus — ignore
    }
    window.dispatchEvent(
      new CustomEvent(nativeBridgeEventName(msg.action), { detail: msg }),
    );
  };

  /**
   * exchanges `NativeBridgeMsg` messages as proto3 JSON strings.
   * @param data
   * @private
   */
  private static parse(data: unknown): NativeBridgeMsg | null {
    try {
      let msg: NativeBridgeMsg;
      if (typeof data === 'string') {
        msg = fromJsonString(NativeBridgeMsgSchema, data);
      } else if (typeof data === 'object' && data !== null) {
        msg = fromJson(NativeBridgeMsgSchema, data as JsonValue);
      } else {
        return null;
      }
      if (msg.action === NativeBridgeActions.NATIVE_BRIDGE_ACTION_UNSPECIFIED) {
        return null;
      }
      return msg;
    } catch {
      return null;
    }
  }

  /**
   * Sends a message to the native host. No-ops silently when the app is not
   * running inside a native webview (e.g., regular browser).
   */
  public send(msg: NativeBridgeMsg): void {
    const str = toJsonString(NativeBridgeMsgSchema, msg);

    if (window.ReactNativeWebView?.postMessage) {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      window.ReactNativeWebView.postMessage(str);
      return;
    }
    const wkHandler = window.webkit?.messageHandlers?.pnmNativeBridge;
    if (wkHandler?.postMessage) {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      wkHandler.postMessage(str);
      return;
    }
    if (window.PnmNative?.postMessage) {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      window.PnmNative.postMessage(str);
      return;
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(str, '*');
    }
    // else: not inside a webview host — intentionally a no-op
  }

  /**
   * True when a real native host channel (not iframe) is present.
   * Detects the available webview channel (React Native WebView, iOS WKWebView,
   * Android JavascriptInterface, or iframe fallback)
   * */
  public isNativeHostDetected(): boolean {
    return (
      !!window.ReactNativeWebView?.postMessage ||
      !!window.webkit?.messageHandlers?.pnmNativeBridge?.postMessage ||
      !!window.PnmNative?.postMessage
    );
  }
}

export const nativeBridge = new NativeBridge();
