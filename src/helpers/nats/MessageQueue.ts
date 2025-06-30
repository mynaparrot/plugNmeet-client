import type { JetStreamClient } from '@nats-io/jetstream';

import { formatNatsError, sleep } from '../utils';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';

const WAITING = 'WAITING',
  PROCESSING = 'PROCESSING',
  MAX_RETRY = 5,
  RETRY_INTERVAL = 500;

interface Message {
  subject: string;
  payload: any;
}

export default class MessageQueue {
  private _isConnected: boolean = false;
  private _js: JetStreamClient | undefined;
  private readonly _queue: Array<Message> = [];
  private _state = WAITING;

  public isConnected = (value: boolean) => {
    this._isConnected = value;
  };

  public js = (value: JetStreamClient) => {
    this._js = value;
    this._isConnected = true;
  };

  public addToQueue = (message: Message) => {
    this._queue.push(message);
    if ((this._state = WAITING)) this.processMessages().then();
  };

  private async processMessages() {
    this._state = PROCESSING;
    if (!this._js) {
      this._state = WAITING;
      return;
    }

    while (this._queue.length > 0) {
      const request = this._queue.shift();
      if (request) {
        for (let i = 0; i < MAX_RETRY; i++) {
          if (!this._js || !this._isConnected) {
            break;
          }

          try {
            await this._js.publish(request.subject, request.payload);
            break;
          } catch (e: any) {
            console.error(e.message);
            if (i === MAX_RETRY) {
              const msg = formatNatsError(e);
              store.dispatch(
                addUserNotification({
                  message: msg,
                  typeOption: 'error',
                }),
              );
            }
            await sleep(RETRY_INTERVAL);
          }
        }
      }
    }
    this._state = WAITING;
  }
}
