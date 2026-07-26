import { emit, getNativePublisherStatus } from './subscriber';
import { sendHeartbeatPing } from './publisher';

// ---- heartbeat  ----
const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 30_000;

let lastPongAt = performance.now();
export const updateLastPongAt = () => {
  lastPongAt = performance.now();
};

let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

export const startNativeHeartbeat = (): void => {
  if (heartbeatTimer) {
    return;
  }
  updateLastPongAt();
  heartbeatTimer = setInterval(() => {
    sendHeartbeatPing();
    const alive = performance.now() - lastPongAt <= HEARTBEAT_TIMEOUT_MS;
    if (alive !== getNativePublisherStatus().available) {
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
