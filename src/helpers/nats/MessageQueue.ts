import { JetStreamClient, JetStreamError } from '@nats-io/jetstream';
import { errors, NatsConnection } from '@nats-io/nats-core';

import { formatNatsError } from '../utils';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';

interface Message {
  subject: string;
  payload: any;
  useJetStream?: boolean;
  retries?: number;
}

// A Map where the key is the full, unique NATS subject.
type SubjectQueues = Map<string, Array<Message>>;
const MAX_RETRIES = 2; // Max number of retries for transient errors

/**
 * A message queue that processes messages in independent, parallel queues
 * based on the message's unique subject which prevents head-of-line blocking.
 * It guarantees that for any single subject, messages are processed in the
 * exact order they were received (FIFO).
 */
export default class MessageQueue {
  private _isConnected: boolean = false;
  private _js: JetStreamClient | undefined;
  private _nc: NatsConnection | undefined;

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

  public setNc = (value: NatsConnection) => {
    this._nc = value;
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
      if (request.useJetStream) {
        // Assuming this._js is always available if _isConnected is true
        await this._js!.publish(request.subject, request.payload);
      } else {
        // Assuming this._nc is always available if _isConnected is true
        this._nc!.publish(request.subject, request.payload);
      }

      // Message sent successfully.
      subjectQueue.shift();
      this.processingSubjects.delete(subject);
      this._isHoldingNotificationShown = false;
      if (subjectQueue.length > 0) {
        this.processSubjectQueue(subject).then();
      }
    } catch (e: any) {
      const formattedError = formatNatsError(e); // Format the error here

      // Check for transient errors that are eligible for retry.
      if (
        request.useJetStream && // Only retry JetStream messages
        (e instanceof errors.TimeoutError ||
          e instanceof errors.NoRespondersError ||
          e instanceof JetStreamError)
      ) {
        request.retries = (request.retries || 0) + 1;

        if (request.retries > MAX_RETRIES) {
          // Exceeded max retries, discard the message.
          console.error(
            `NATS message for subject '${subject}' failed after ${MAX_RETRIES} retries. Discarding.`,
            { error: formattedError, message: request },
          );
          store.dispatch(
            addUserNotification({
              message: i18n.t('notifications.queue-discarded-message', {
                error: formattedError,
              }),
              typeOption: 'error',
            }),
          );

          subjectQueue.shift(); // Discard
          this.processingSubjects.delete(subject);
          if (subjectQueue.length > 0) {
            this.processSubjectQueue(subject).then();
          }
        } else {
          // Retry with a delay.
          console.warn(
            `NATS transient error for subject '${subject}'. Retrying (${request.retries}/${MAX_RETRIES})...`,
            { error: formattedError },
          );
          if (!this._isHoldingNotificationShown) {
            store.dispatch(
              addUserNotification({
                message: i18n.t('notifications.queue-holding-messages', {
                  error: formattedError,
                }),
                typeOption: 'warning',
              }),
            );
            this._isHoldingNotificationShown = true;
          }

          this.processingSubjects.delete(subject);
          setTimeout(() => {
            this.processSubjectQueue(subject).then();
          }, 500 * request.retries); // Simple exponential backoff
        }
      } else {
        // This is a non-recoverable or non-JetStream error. Discard immediately.
        console.error(
          `Found poison message or non-retryable error for subject '${subject}'. Discarding.`,
          { error: formattedError, message: request }, // Use formatted error
        );
        store.dispatch(
          addUserNotification({
            message: i18n.t('notifications.queue-discarded-message', {
              error: formattedError, // Use formatted error
            }),
            typeOption: 'error',
          }),
        );

        subjectQueue.shift(); // Discard
        this.processingSubjects.delete(subject);
        if (subjectQueue.length > 0) {
          this.processSubjectQueue(subject).then();
        }
      }
    }
  }
}
