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
 * Inbound messages are re-dispatched as a single CustomEvent so listeners
 * never conflict: `pnm-native-bridge`.
 */
export const NATIVE_BRIDGE_EVENT = 'pnm-native-bridge';

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
  private started = false;

  /**
   * Activates the bridge by registering message listeners. Must be called
   * only when the app is running as a hybrid client inside a native webview.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  public start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
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
    window.dispatchEvent(new CustomEvent(NATIVE_BRIDGE_EVENT, { detail: msg }));
  };

  /**
   * exchanges `NativeBridgeMsg` messages as proto3 JSON strings.
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
}

export const nativeBridge = new NativeBridge();
