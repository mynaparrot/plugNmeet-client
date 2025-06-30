type TimerData = {
  callbackId: number;
};

export type TimerWorker = {
  setTimeout(callback: () => void, timeoutMs?: number): number;
  clearTimeout(callbackId: number): void;
  terminate(): void;
};

// we'll have to write like this way, otherwise browser won't load because of cross origin error
const timerWorker = `
const timeoutIds = new Map();
self.onmessage = (event) => {
  if (event.data.timeoutMs !== undefined) {
    const timeoutId = self.setTimeout(() => {
      self.postMessage({ callbackId: event.data.callbackId });
      timeoutIds.delete(event.data.callbackId);
    }, event.data.timeoutMs);
    timeoutIds.set(event.data.callbackId, timeoutId);
  } else {
    const timeoutId = timeoutIds.get(event.data.callbackId);
    self.clearTimeout(timeoutId);
    timeoutIds.delete(event.data.callbackId);
  }
};
`;

export function createTimerWorker(): TimerWorker {
  const callbacks = new Map<number, () => void>();
  const worker = new Worker(
    URL.createObjectURL(new Blob([timerWorker], { type: 'text/javascript' })),
  );

  worker.addEventListener('message', (event: MessageEvent<TimerData>) => {
    const callback = callbacks.get(event.data.callbackId);
    if (!callback) {
      return;
    }
    callbacks.delete(event.data.callbackId);
    callback();
  });

  let nextCallbackId = 1;

  function setTimeout(callback: () => void, timeoutMs = 0) {
    const callbackId = nextCallbackId++;
    callbacks.set(callbackId, callback);
    // oxlint-disable-next-line require-post-message-target-origin
    worker.postMessage({ callbackId, timeoutMs });
    return callbackId;
  }

  function clearTimeout(callbackId: number) {
    if (!callbacks.has(callbackId)) {
      return;
    }
    // oxlint-disable-next-line require-post-message-target-origin
    worker.postMessage({ callbackId });
    callbacks.delete(callbackId);
  }

  function terminate() {
    callbacks.clear();
    worker.terminate();
  }

  return { setTimeout, clearTimeout, terminate };
}
