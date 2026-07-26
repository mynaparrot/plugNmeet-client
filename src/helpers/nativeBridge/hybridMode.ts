/**
 * Hybrid-mode detection.
 * Hybrid mode = the web client runs inside a native app's webview and acts as
 * subscriber-only UI controller; media publishing is delegated to the native host.
 *
 * Source of truth (in priority order):
 * 1. `window.plugNmeetConfig.force_hybrid_web === true` (config override, useful
 *    for testing or simple shells)
 * 2. session `clientType` from `VerifyTokenRes` (set by the server from the JWT claims)
 */
import { ClientType } from 'plugnmeet-protocol-js';

import { store } from '../../store';

export const isHybridMode = (): boolean => {
  const cfg = (window as any).plugNmeetConfig;
  if (cfg?.force_hybrid_web === true) {
    return true;
  }
  return store.getState().session.clientType === ClientType.HYBRID_WEB;
};
