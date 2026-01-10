import { JetStreamClient, JetStreamError } from '@nats-io/jetstream';
import { errors } from '@nats-io/nats-core';

import { formatNatsError } from '../utils';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';

interface Message {
  subject: string;
  payload: any;
}

// A Map where the key is the full, unique NATS subject.
type SubjectQueues = Map<string, Array<Message>>;

/**
 * A message queue that processes messages in independent, parallel queues
 * based on the message's unique subject which prevents head-of-line blocking.
 * It guarantees that for any single subject, messages are processed in the
 * exact order they were received (FIFO).
 */
export default class MessageQueue {
  private _isConnected: boolean = false;
  private _js: JetStreamClient | undefined;

  private readonly queues: SubjectQueues = new Map();
  private readonly processingSubjects: Set<string> = new Set();

  private _isHoldingNotificationShown = false;

  public setIsConnected = (value: boolean) => {
    this._isConnected = value;
    if (this._isConnected) {
      for (const subject of this.queues.keys()) {
        this.processSubjectQueue(subject).then();
      }
    }
  };

  public setJs = (value: JetStreamClient) => {
    this._js = value;
  };

  public addToQueue = (message: Message) => {
    const { subject } = message;

    if (!this.queues.has(subject)) {
      this.queues.set(subject, []);
    }
    const subjectQueue = this.queues.get(subject)!;
    subjectQueue.push(message);

    this.processSubjectQueue(subject).then();
  };

  private async processSubjectQueue(subject: string) {
    if (this.processingSubjects.has(subject)) {
      return;
    }

    const subjectQueue = this.queues.get(subject);
    if (!subjectQueue || subjectQueue.length === 0 || !this._isConnected) {
      return;
    }

    this.processingSubjects.add(subject);

    const request = subjectQueue[0];

    try {
      if (!this._js) {
        return;
      }

      await this._js.publish(request.subject, request.payload);
      subjectQueue.shift();
      this._isHoldingNotificationShown = false;
    } catch (e: any) {
      if (
        e instanceof errors.TimeoutError ||
        e instanceof errors.NoRespondersError ||
        e instanceof JetStreamError
      ) {
        console.error(
          `NATS transient error for subject '${subject}': ${e.message}. Holding queue.`,
        );
        if (e.message.includes('connection draining')) {
          return;
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
        return;
      } else {
        console.error(
          `Found poison message for subject '${subject}'. Discarding.`,
          { error: e.message, message: request },
        );
        store.dispatch(
          addUserNotification({
            message: i18n.t('notifications.queue-discarded-message', {
              error: e.message,
            }),
            typeOption: 'error',
          }),
        );
        subjectQueue.shift();
      }
    } finally {
      this.processingSubjects.delete(subject);

      if (subjectQueue.length > 0) {
        this.processSubjectQueue(subject).then();
      }
    }
  }
}
