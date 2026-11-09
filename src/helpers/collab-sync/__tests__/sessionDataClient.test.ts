import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NatsMsgClientToServerEvents, SessionDataType } from 'plugnmeet-protocol-js';
import type { SessionDataHeader } from 'plugnmeet-protocol-js';

const { conn, nats } = vi.hoisted(() => ({
  conn: {
    enableE2EE: false,
    encryptData: vi.fn(async (payload: Uint8Array): Promise<Uint8Array | undefined> => payload),
    sendMessageToCoreWorker: vi.fn(),
    sendMessageToSystemWorker: vi.fn(),
  },
  nats: { connected: true },
}));

vi.mock('../../nats', () => ({
  getNatsConn: () => (nats.connected ? conn : undefined),
}));

import { SessionDataClient } from '../sessionDataClient';
import { SAVE_ACK_TIMEOUT_MS, SERVER_FIRST_SYNC_TIMEOUT_MS } from '../sessionDataSync';

type SaveCall = { event: number; msg: string; binMsg?: Uint8Array };
type FetchCall = { event: number; msg: string };

const saveCalls = () =>
  (conn.sendMessageToCoreWorker.mock.calls as unknown as [SaveCall][]).filter(
    ([m]) => m.event === NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
  );
const saveHeaders = () => saveCalls().map(([m]) => JSON.parse(m.msg) as Record<string, string>);
const fetchCalls = () =>
  (conn.sendMessageToSystemWorker.mock.calls as unknown as [FetchCall][]).filter(
    ([m]) => m.event === NatsMsgClientToServerEvents.SESSION_DATA_FETCH_REQUEST,
  );
const fetchHeaders = () => fetchCalls().map(([m]) => JSON.parse(m.msg) as Record<string, string>);

const ack = (client: SessionDataClient, index: number, success = true) => {
  const header = saveHeaders()[index];
  if (!header) return;
  client.handleSaveResponse({
    dataType: SessionDataType.NOTEPAD,
    key: header.key,
    requestId: header.requestId,
    success,
  } as SessionDataHeader);
};

// NOTEPAD (not WHITEBOARD) so the tests prove the header uses the client's dataType.
const newClient = () => new SessionDataClient(SessionDataType.NOTEPAD);

beforeEach(() => {
  vi.useFakeTimers();
  nats.connected = true;
  conn.enableE2EE = false;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionDataClient upload', () => {
  it('resolves false without a NATS connection and sends nothing', async () => {
    nats.connected = false;
    await expect(newClient().upload(new Uint8Array([1]), 'k')).resolves.toBe(false);
    expect(saveCalls()).toHaveLength(0);
  });

  it('resolves false when E2EE encryption fails', async () => {
    conn.enableE2EE = true;
    conn.encryptData.mockResolvedValueOnce(undefined);
    await expect(newClient().upload(new Uint8Array([1]), 'k')).resolves.toBe(false);
    expect(saveCalls()).toHaveLength(0);
  });

  it('resolves true on a successful ack and false on a failed one', async () => {
    const client = newClient();
    const first = client.upload(new Uint8Array([1]), 'k');
    const second = client.upload(new Uint8Array([2]), 'k');

    ack(client, 0, true);
    ack(client, 1, false);

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(false);
  });

  it('resolves false when the ack never arrives', async () => {
    const client = newClient();
    const pending = client.upload(new Uint8Array([1]), 'k');
    await vi.advanceTimersByTimeAsync(SAVE_ACK_TIMEOUT_MS);
    await expect(pending).resolves.toBe(false);
  });

  it('sends the client dataType and targetRoomId only when given', async () => {
    const client = newClient();
    void client.upload(new Uint8Array([1]), 'k');
    void client.upload(new Uint8Array([2]), 'k', 'room-2');

    expect(saveHeaders()[0]).toMatchObject({
      dataType: 'SESSION_DATA_TYPE_NOTEPAD',
      key: 'k',
    });
    expect(saveHeaders()[0].targetRoomId).toBeUndefined();
    expect(saveHeaders()[1].targetRoomId).toBe('room-2');
    expect(saveHeaders()[0].requestId).toBeTruthy();
    expect(saveHeaders()[0].requestId).not.toBe(saveHeaders()[1].requestId);
  });

  it('ignores an ack for an unknown requestId', async () => {
    const client = newClient();
    const pending = client.upload(new Uint8Array([1]), 'k');
    client.handleSaveResponse({ requestId: 'unknown', success: true } as SessionDataHeader);

    await vi.advanceTimersByTimeAsync(SAVE_ACK_TIMEOUT_MS);
    await expect(pending).resolves.toBe(false);
  });

  it('settles pending saves with false', async () => {
    const client = newClient();
    const pending = client.upload(new Uint8Array([1]), 'k');
    client.settlePendingSaves();
    await expect(pending).resolves.toBe(false);
    // Nothing left to timeout: a later ack must not resurrect a waiter.
    ack(client, 0, true);
  });
});

describe('SessionDataClient fetch', () => {
  it('resolves false without a NATS connection and sends nothing', async () => {
    nats.connected = false;
    await expect(newClient().fetch('k')).resolves.toBe(false);
    expect(fetchCalls()).toHaveLength(0);
  });

  it('resolves true when the caller resolves the waiter', async () => {
    const client = newClient();
    const pending = client.fetch('k');
    expect(fetchHeaders()).toHaveLength(1);
    expect(fetchHeaders()[0]).toMatchObject({ dataType: 'SESSION_DATA_TYPE_NOTEPAD', key: 'k' });

    client.resolveFetchWaiter('k');
    await expect(pending).resolves.toBe(true);
  });

  it('resolves false on timeout', async () => {
    const client = newClient();
    const pending = client.fetch('k');
    await vi.advanceTimersByTimeAsync(SERVER_FIRST_SYNC_TIMEOUT_MS);
    await expect(pending).resolves.toBe(false);
  });

  it('shares one request per key and sends again once settled', async () => {
    const client = newClient();
    const first = client.fetch('k');
    const second = client.fetch('k');

    expect(second).toBe(first);
    expect(fetchCalls()).toHaveLength(1);

    client.resolveFetchWaiter('k');
    await expect(first).resolves.toBe(true);

    const third = client.fetch('k');
    expect(third).not.toBe(first);
    expect(fetchCalls()).toHaveLength(2);
    client.resolveFetchWaiter('k');
    await expect(third).resolves.toBe(true);
  });

  it('resolves pending fetches with false when cancelled', async () => {
    const client = newClient();
    const pending = client.fetch('k');
    client.cancelPendingFetches();
    await expect(pending).resolves.toBe(false);
  });
});
