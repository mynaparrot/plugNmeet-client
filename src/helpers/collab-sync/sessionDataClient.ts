import { create, toJsonString } from '@bufbuild/protobuf';
import {
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  SessionDataHeader,
  SessionDataHeaderSchema,
  SessionDataType,
} from 'plugnmeet-protocol-js';

import { getNatsConn } from '../nats';
import type ConnectNats from '../nats/ConnectNats';
import { SAVE_ACK_TIMEOUT_MS, SERVER_FIRST_SYNC_TIMEOUT_MS } from './sessionDataSync';

export interface SessionDataSaveRequest {
  dataType: SessionDataType;
  key: string;
  value: Uint8Array;
  requestId?: string;
  targetRoomId?: string;
}

/**
 * Send a SESSION_DATA_SAVE message. `requestId` and `targetRoomId` are only
 * emitted when set, so the wire format stays identical for callers that omit
 * them (fire-and-forget saves).
 */
export const sendSessionDataSave = (
  conn: ConnectNats,
  { dataType, key, value, requestId, targetRoomId }: SessionDataSaveRequest,
) => {
  conn.sendMessageToCoreWorker(
    create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.SESSION_DATA_SAVE,
      msg: toJsonString(
        SessionDataHeaderSchema,
        create(SessionDataHeaderSchema, {
          dataType,
          key,
          ...(requestId ? { requestId } : {}),
          ...(targetRoomId ? { targetRoomId } : {}),
        }),
      ),
      binMsg: value,
    }),
  );
};

/** Ask the server for the stored value of `key`. */
export const sendSessionDataFetch = (conn: ConnectNats, dataType: SessionDataType, key: string) => {
  conn.sendMessageToSystemWorker(
    create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.SESSION_DATA_FETCH_REQUEST,
      msg: toJsonString(
        SessionDataHeaderSchema,
        create(SessionDataHeaderSchema, { dataType, key }),
      ),
    }),
  );
};

/**
 * SESSION_DATA transport bookkeeping for one data type: request/ack waiters for
 * saves and fetches. Save policy and doc application stay in the owning
 * controller.
 */
export class SessionDataClient {
  private sessionDataWaiters = new Map<
    string,
    {
      resolve: (arrived: boolean) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  // In-flight fetch per key, so concurrent callers share one request/response.
  private sessionDataFetches = new Map<string, Promise<boolean>>();
  // Waiter per SESSION_DATA_SAVE requestId, resolved by SESSION_DATA_SAVE_RESPONSE.
  private saveAckWaiters = new Map<
    string,
    {
      resolve: (ok: boolean) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(private readonly dataType: SessionDataType) {}

  /**
   * Send a SESSION_DATA save and resolve `true` only once the server acks it
   * (SESSION_DATA_SAVE_RESPONSE echoes our requestId). No NATS connection,
   * encryption failure and a missed ack all resolve `false`.
   */
  upload = async (update: Uint8Array, key: string, targetRoomId?: string): Promise<boolean> => {
    const conn = getNatsConn();
    if (!conn) return false;
    let value = update;
    if (conn.enableE2EE) {
      const enc = await conn.encryptData(update);
      if (typeof enc === 'undefined') return false;
      value = enc;
    }
    const requestId = crypto.randomUUID();
    const acked = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.saveAckWaiters.delete(requestId);
        resolve(false);
      }, SAVE_ACK_TIMEOUT_MS);
      this.saveAckWaiters.set(requestId, { resolve, timer });
    });
    sendSessionDataSave(conn, { dataType: this.dataType, key, value, requestId, targetRoomId });
    return acked;
  };

  /** Resolve the save waiters for a SESSION_DATA_SAVE_RESPONSE (header only). */
  handleSaveResponse = (header: SessionDataHeader) => {
    const requestId = header.requestId;
    if (!requestId) return;
    const waiter = this.saveAckWaiters.get(requestId);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.saveAckWaiters.delete(requestId);
    waiter.resolve(header.success === true);
  };

  /**
   * Fetch a session-data value from the server. Resolves `true` once a response
   * arrives — including an EMPTY response, which legitimately confirms the key
   * is absent. Resolves `false` on timeout or when there is no NATS connection.
   * The caller resolves the waiter only after it has handled the response.
   */
  fetch = (key: string): Promise<boolean> => {
    // Single-flight per key: a concurrent caller must not overwrite the first
    // caller's waiter (whose timeout would then delete the newer one).
    const inFlight = this.sessionDataFetches.get(key);
    if (inFlight) {
      return inFlight;
    }

    const promise = new Promise<boolean>((resolve) => {
      const conn = getNatsConn();
      if (!conn) {
        resolve(false);
        return;
      }
      const timer = setTimeout(() => {
        this.sessionDataWaiters.delete(key);
        resolve(false);
      }, SERVER_FIRST_SYNC_TIMEOUT_MS);
      this.sessionDataWaiters.set(key, { resolve, timer });

      sendSessionDataFetch(conn, this.dataType, key);
    }).finally(() => {
      // Only drop our own entry: a newer fetch may already have registered.
      if (this.sessionDataFetches.get(key) === promise) {
        this.sessionDataFetches.delete(key);
      }
    });

    this.sessionDataFetches.set(key, promise);
    return promise;
  };

  /**
   * Resolve the pending fetch waiter of `key`. A response arrived (even if empty
   * — the server confirmed the key is absent), so it resolves `true`.
   */
  resolveFetchWaiter = (key: string) => {
    const waiter = this.sessionDataWaiters.get(key);
    if (waiter) {
      clearTimeout(waiter.timer);
      this.sessionDataWaiters.delete(key);
      waiter.resolve(true);
    }
  };

  /** Teardown means the pending fetches will never get their response. */
  cancelPendingFetches = () => {
    for (const waiter of this.sessionDataWaiters.values()) {
      clearTimeout(waiter.timer);
      waiter.resolve(false);
    }
    this.sessionDataWaiters.clear();
  };

  /** No further ack can arrive: settle every pending save. */
  settlePendingSaves = () => {
    for (const waiter of this.saveAckWaiters.values()) {
      clearTimeout(waiter.timer);
      waiter.resolve(false);
    }
    this.saveAckWaiters.clear();
  };
}
