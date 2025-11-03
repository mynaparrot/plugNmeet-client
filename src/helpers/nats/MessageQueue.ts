import { JetStreamClient, JetStreamError } from '@nats-io/jetstream';
import { errors } from '@nats-io/nats-core';

import { formatNatsError } from '../utils';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';

const WAITING = 'WAITING',
  PROCESSING = 'PROCESSING';

interface Message {
  subject: string;
  payload: any;
}

export default class MessageQueue {
  private _isConnected: boolean = false;
  private _js: JetStreamClient | undefined;
  private readonly _queue: Array<Message> = [];
  private _state = WAITING;
  private _isHoldingNotificationShown = false;

  /**
   * Updates the connection status of the queue.
   * If the status is now connected, it will try to process any held messages.
   * @param value The new connection status.
   */
  public setIsConnected = (value: boolean) => {
    this._isConnected = value;
    if (this._isConnected) {
      this.processMessages().then();
    }
  };

  /**
   * Sets the JetStream client.
   * @param value The JetStream client instance.
   */
  public setJs = (value: JetStreamClient) => {
    this._js = value;
  };

  /**
   * Adds a new message to the queue.
   * If the queue is not already processing, it will start.
   * @param message The message to add.
   */
  public addToQueue = (message: Message) => {
    this._queue.push(message);
    if (this._state === WAITING) {
      this.processMessages().then();
    }
  };

  /**
   * Processes the message queue.
   * It will send messages one by one as long as the connection is active.
   * If a message fails to send, it stops processing and holds the rest of the queue
   * until `setIsConnected(true)` is called again.
   */
  private async processMessages() {
    if (this._state === PROCESSING) {
      return;
    }
    this._state = PROCESSING;

    while (this._queue.length > 0 && this._isConnected) {
      if (!this._js) {
        break;
      }

      const request = this._queue[0];

      try {
        await this._js.publish(request.subject, request.payload);
        this._queue.shift();
        this._isHoldingNotificationShown = false;
      } catch (e: any) {
        // Check if this is a transient network error or a terminal message error.
        if (
          e instanceof errors.TimeoutError ||
          e instanceof errors.NoRespondersError ||
          e instanceof JetStreamError
        ) {
          // It's a network- or server-related issue. Hold the queue and retry later.
          console.error(
            `NATS transient error: ${e.message}. Holding queue until reconnect.`,
          );
          // Don't show a notification if the error is due to a normal connection drain.
          // This happens during logout and would confuse the user.
          if (e.message.includes('connection draining')) {
            break;
          }

          if (!this._isHoldingNotificationShown) {
            const msg = formatNatsError(e);
            store.dispatch(
              addUserNotification({
                message: i18n.t('notifications.queue-holding-messages', {
                  error: msg,
                }),
                typeOption: 'warning',
              }),
            );
            this._isHoldingNotificationShown = true;
          }
          // Stop the loop. The message remains at the front of the queue.
          break;
        } else {
          // This is a "poison message" or other terminal error.
          // We must discard it to prevent blocking the entire queue.
          console.error(
            `Found poison message. Discarding to prevent queue blockage.`,
            {
              error: e.message,
              message: request,
            },
          );
          store.dispatch(
            addUserNotification({
              message: i18n.t('notifications.queue-discarded-message', {
                error: e.message,
              }),
              typeOption: 'error',
            }),
          );
          // Discard the poison message and continue to the next one.
          this._queue.shift();
        }
      }
    }

    this._state = WAITING;
  }
}
