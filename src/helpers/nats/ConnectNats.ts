import { Dispatch } from 'react';
import { toast } from 'react-toastify';
import { isE2EESupported } from 'livekit-client';
import { jetstream, JetStreamClient } from '@nats-io/jetstream';
import { create, toBinary, toJsonString } from '@bufbuild/protobuf';
import {
  NatsConnection,
  tokenAuthenticator,
  wsconnect,
} from '@nats-io/nats-core';
import {
  AnalyticsDataMsgSchema,
  AnalyticsEvents,
  AnalyticsEventType,
  ChatMessageSchema,
  DataChannelMessageSchema,
  DataMsgBodyType,
  EndToEndEncryptionFeatures,
  InsightsTranslateTextReqSchema,
  NatsMsgClientToServer,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  NatsSubjects,
  PrivateDataDeliverySchema,
} from 'plugnmeet-protocol-js';

import MessageQueue from './MessageQueue';
import SubscriptionHandler from './SubscriptionHandler';

import { IErrorPageProps } from '../../components/extra-pages/Error';
import { IConnectLivekit } from '../livekit/types';
import { store } from '../../store';
import i18n from '../i18n';
import {
  decryptDataFromUint8Array,
  encryptDataToUint8Array,
  importSecretKeyFromPlainText,
} from '../libs/cryptoMessages';
import { ICurrentRoom } from '../../store/slices/interfaces/session';
import {
  formatNatsError,
  isUserRecorder,
  isValidHttpUrl,
  randomString,
} from '../utils';
import {
  addSelfInsertedE2EESecretKey,
  addUserNotification,
  updateIsNatsServerConnected,
} from '../../store/slices/roomSettingsSlice';
import { roomConnectionStatus } from '../../components/app/helper';
import { destroyAudioManager } from '../libs/AudioActivityManager';
import { deleteRoomDB } from '../libs/idb';
import { createLivekitConnection } from '../livekit/utils';
import { executeChatTranslation } from '../../components/translation-transcription/helpers/apiConnections';

const RENEW_TOKEN_FREQUENT = 3 * 60 * 1000,
  PING_INTERVAL = 10 * 1000,
  STATUS_CHECKER_INTERVAL = 500,
  USERS_SYNC_INTERVAL = 30 * 1000,
  MAX_MISSED_PONGS = 12;
export type PrivateDataDeliveryType = 'CHAT' | 'DATA_MSG';

export default class ConnectNats {
  // connections
  private _nc: NatsConnection | undefined;
  private _js: JetStreamClient | undefined;
  // auth
  private readonly _natsWSUrls: string[];
  private _token: string;
  // e2ee
  private _enableE2EE: boolean = false;
  private _enableE2EEChat: boolean = false;
  private _enableE2EEWhiteboard: boolean = false;
  // ui
  private toastIdConnecting: any = undefined;

  // room info
  private readonly _roomId: string;
  private readonly _userId: string;
  private _userName: string = '';
  private _isAdmin: boolean = false;
  private readonly _isRecorder: boolean = false;
  private readonly _roomStreamName: string;
  private readonly _subjects: NatsSubjects;
  // this value won't be updated
  // so, don't use it for metadata those will be updated
  private _currentRoomInfo: ICurrentRoom | undefined;

  // intervals
  private tokenRenewInterval: any;
  private pingInterval: any;
  private statusCheckerInterval: any;
  private reconciliationInterval: any;
  private missedPongs = 0;
  private pongMissedToastId: any;
  private isRoomReconnecting: boolean = false;

  // state setters
  private readonly _setErrorState: Dispatch<IErrorPageProps>;
  private readonly _setRoomConnectionStatusState: Dispatch<roomConnectionStatus>;
  private readonly _setCurrentMediaServerConn: Dispatch<IConnectLivekit>;

  // media
  private _mediaServerConn: IConnectLivekit | undefined = undefined;
  // helpers
  private readonly messageQueue: MessageQueue;
  private readonly subscriptionHandler: SubscriptionHandler;

  constructor(
    natsWSUrls: string[],
    token: string,
    roomId: string,
    userId: string,
    roomStreamName: string,
    subjects: NatsSubjects,
    setErrorState: Dispatch<IErrorPageProps>,
    setRoomConnectionStatusState: Dispatch<roomConnectionStatus>,
    setCurrentMediaServerConn: Dispatch<IConnectLivekit>,
  ) {
    this._natsWSUrls = natsWSUrls;
    this._token = token;
    this._roomId = roomId;
    this._userId = userId;
    this._isRecorder = isUserRecorder(userId);
    this._roomStreamName = roomStreamName;
    this._subjects = subjects;

    this._setErrorState = setErrorState;
    this._setRoomConnectionStatusState = setRoomConnectionStatusState;
    this._setCurrentMediaServerConn = setCurrentMediaServerConn;

    this.messageQueue = new MessageQueue();
    this.subscriptionHandler = new SubscriptionHandler(this);
  }

  // getters & setters for private properties
  /**
   * NATS connection
   */
  get nc(): NatsConnection | undefined {
    return this._nc;
  }
  /**
   * NATS JetStream client
   */
  get js(): JetStreamClient | undefined {
    return this._js;
  }
  /**
   * Is the current user an admin
   */
  get isAdmin(): boolean {
    return this._isAdmin;
  }
  /**
   * Set if the current user is an admin
   * @param isAdmin
   */
  set isAdmin(isAdmin: boolean) {
    this._isAdmin = isAdmin;
  }
  /**
   * The ID of the room
   */
  get roomId(): string {
    return this._roomId;
  }
  /**
   * The ID of the current user
   */
  get userId(): string {
    return this._userId;
  }
  /**
   * The name of the current user
   */
  get userName(): string {
    return this._userName;
  }
  /**
   * Set the name of the current user
   * @param userName
   */
  set userName(userName: string) {
    this._userName = userName;
  }
  /**
   * Is the current user a recorder
   */
  get isRecorder(): boolean {
    return this._isRecorder;
  }
  /**
   * The name of the room stream
   */
  get roomStreamName(): string {
    return this._roomStreamName;
  }
  /**
   * NATS subjects
   */
  get subjects(): NatsSubjects {
    return this._subjects;
  }
  /**
   * The media server connection
   */
  get mediaServerConn(): IConnectLivekit | undefined {
    return this._mediaServerConn;
  }
  /**
   * The NATS token
   */
  get token(): string {
    return this._token;
  }
  /**
   * Set the NATS token
   * @param token
   */
  set token(token: string) {
    this._token = token;
  }
  /**
   * Is E2EE enabled
   */
  get enableE2EE(): boolean {
    return this._enableE2EE;
  }
  /**
   * Is E2EE enabled for chat
   */
  get enableE2EEChat(): boolean {
    return this._enableE2EEChat;
  }
  /**
   * Is E2EE enabled for whiteboard
   */
  get enableE2EEWhiteboard(): boolean {
    return this._enableE2EEWhiteboard;
  }
  /**
   * The current room info
   */
  get currentRoomInfo(): ICurrentRoom | undefined {
    return this._currentRoomInfo;
  }
  /**
   * Set the current room info
   * @param currentRoomInfo
   */
  set currentRoomInfo(currentRoomInfo: ICurrentRoom | undefined) {
    this._currentRoomInfo = currentRoomInfo;
  }

  public openConn = async () => {
    try {
      this._nc = await wsconnect({
        name: `plugnmeet-client-${this._roomId}_${this._userId}`,
        servers: this._natsWSUrls,
        authenticator: tokenAuthenticator(() => this._token),
        pingInterval: PING_INTERVAL,
        noEcho: true,
      });
      this.messageQueue.setNc(this._nc);

      console.info(`connected ${this._nc.getServer()}`);
    } catch (e) {
      console.error(e);
      this.setErrorStatus(
        i18n.t('notifications.nats-error-title'),
        formatNatsError(e),
      );
      return;
    }

    this._setRoomConnectionStatusState('receiving-data');
    this._js = jetstream(this._nc);
    this.messageQueue.setJs(this._js);
    this.messageQueue.setIsConnected(true);

    // now change status to connected
    store.dispatch(updateIsNatsServerConnected(true));
    // start monitoring connection
    this.monitorConnStatus().then();

    // initialize all subscriptions
    this.subscriptionHandler.initializeSubscriptions();

    this.startTokenRenewInterval();
    this.startPingToServer();

    // request for initial data
    this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_INITIAL_DATA,
      }),
    );
  };

  public endSession = async (msg: string) => {
    // Immediately update UI and stop new messages
    this.setErrorStatus(
      i18n.t('notifications.room-disconnected-title'),
      i18n.t(msg),
    );
    this.messageQueue.setIsConnected(false);
    this._setRoomConnectionStatusState('disconnected');

    // Clear all intervals to prevent further actions
    if (this.pongMissedToastId) {
      toast.dismiss(this.pongMissedToastId);
      this.pongMissedToastId = undefined;
    }
    clearInterval(this.tokenRenewInterval);
    clearInterval(this.pingInterval);
    clearInterval(this.reconciliationInterval);
    this.subscriptionHandler.handleParticipants.clearParticipantCounterInterval();

    // Concurrently run all cleanup tasks.
    const cleanupPromises: Promise<void>[] = [];
    if (this.mediaServerConn) {
      cleanupPromises.push(this.mediaServerConn.disconnectRoom(true));
    }
    if (this._nc && !this._nc.isClosed()) {
      cleanupPromises.push(this._nc.close());
    }
    cleanupPromises.push(deleteRoomDB());

    await Promise.allSettled(cleanupPromises);

    // Final resource cleanup
    destroyAudioManager();

    // Handle post-session navigation after a delay
    // This timeout allows the user time to read the disconnection message.
    setTimeout(() => {
      const meta = this._currentRoomInfo?.metadata;
      if (meta?.isBreakoutRoom) {
        window.close();
        return; // Exit to avoid processing logoutUrl
      }

      if (meta?.logoutUrl && isValidHttpUrl(meta.logoutUrl)) {
        window.location.href = meta.logoutUrl;
      }
    }, 3000);
  };

  public setErrorStatus(title: string, reason: string) {
    this._setRoomConnectionStatusState('error');
    this._setErrorState({
      title: title,
      text: reason,
    });
  }

  public setRoomConnectionStatusState(status: roomConnectionStatus) {
    this._setRoomConnectionStatusState(status);
  }

  private async monitorConnStatus() {
    if (typeof this._nc === 'undefined') {
      return;
    }
    const startStatusChecker = () => {
      if (typeof this.statusCheckerInterval === 'undefined') {
        this.statusCheckerInterval = setInterval(() => {
          if (this._nc?.isClosed()) {
            this.messageQueue.setIsConnected(false);
            this.endSession('notifications.room-disconnected-network-error');

            clearInterval(this.statusCheckerInterval);
            this.statusCheckerInterval = undefined;
            this.isRoomReconnecting = false;
          }
        }, STATUS_CHECKER_INTERVAL);
      }
    };

    for await (const s of this._nc.status()) {
      switch (s.type) {
        case 'disconnect':
        case 'staleConnection':
        case 'close':
          // when nats connection drops during that time, it disconnects first
          // then start reconnecting, so we can set false here only
          store.dispatch(updateIsNatsServerConnected(false));
          this.messageQueue.setIsConnected(false);
          if (s.type === 'staleConnection') {
            await this._nc.close();
          } else if (s.type === 'close') {
            if (!this._nc.isClosed()) {
              await this._nc.close();
            }
          }
          break;
        case 'reconnecting':
          if (!this.isRoomReconnecting) {
            this.toastIdConnecting = toast.loading(
              i18n.t('notifications.room-disconnected-reconnecting'),
              {
                type: 'warning',
                closeButton: false,
                autoClose: false,
              },
            );
            this.isRoomReconnecting = true;
            startStatusChecker();
          }
          break;
        case 'reconnect':
        case 'forceReconnect':
          if (this.toastIdConnecting) {
            toast.dismiss(this.toastIdConnecting);
            this.toastIdConnecting = undefined;
          }
          store.dispatch(updateIsNatsServerConnected(true));
          this.messageQueue.setIsConnected(true);

          clearInterval(this.statusCheckerInterval);
          this.statusCheckerInterval = undefined;
          this.isRoomReconnecting = false;
          break;
        case 'slowConsumer':
          toast(i18n.t('notifications.your-connection-quality-not-good'), {
            type: 'warning',
          });
          break;
      }
    }
  }

  /**
   * Sends a message to the system worker with guaranteed delivery.
   * This method uses JetStream to ensure the message is received by the server.
   * It is used for critical messages like PINGs, token renewals, and private data delivery.
   * @param data The message to send.
   */
  public sendMessageToSystemWorker = (data: NatsMsgClientToServer) => {
    const subject =
      this._subjects.systemJsWorker + '.' + this._roomId + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(NatsMsgClientToServerSchema, data),
      useJetStream: true,
    });
  };

  private sendPrivateData(
    payload: Uint8Array<ArrayBufferLike>,
    type: PrivateDataDeliveryType,
    toUserId: string,
    echoToSender: boolean,
  ) {
    const msg = toJsonString(
      PrivateDataDeliverySchema,
      create(PrivateDataDeliverySchema, {
        toUserId,
        echoToSender,
        type,
      }),
    );

    this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_PRIVATE_DATA_DELIVERY,
        msg,
        binMsg: payload,
      }),
    );
  }

  public async encryptData(payload: Uint8Array) {
    try {
      //  Encrypt the binary data directly to a Uint8Array
      return await encryptDataToUint8Array(payload);
    } catch (e: any) {
      store.dispatch(
        addUserNotification({
          message: 'Encryption error: ' + e.message,
          typeOption: 'error',
        }),
      );
      console.error('Encryption error:' + e.message);
    }
    return undefined;
  }

  public async decryptData(payload: Uint8Array) {
    try {
      return await decryptDataFromUint8Array(payload);
    } catch (e: any) {
      store.dispatch(
        addUserNotification({
          message: 'Decryption error: ' + e.message,
          typeOption: 'error',
        }),
      );
      console.error('Decryption error:' + e.message);
    }
    return undefined;
  }

  /**
   * Sends a chat message.
   * Private messages are sent via the system worker with JetStream's guaranteed delivery.
   * Public messages are sent as fire-and-forget core NATS messages to the public chat subject.
   * Both are managed by the MessageQueue.
   */
  public sendChatMsg = async (to: string, msg: string) => {
    if (!this._nc || this._nc.isClosed()) {
      return;
    }

    const isPrivate = to !== 'public';
    const chatMessage = create(ChatMessageSchema, {
      id: randomString(),
      fromName: this._userName,
      fromUserId: this._userId,
      sentAt: Date.now().toString(),
      toUserId: to !== 'public' ? to : undefined,
      isPrivate: isPrivate,
      message: msg,
      fromAdmin: this.isAdmin,
    });

    // check translation settings
    const state = store.getState();
    const chatTranslationFeatures =
      state.session.currentRoom?.metadata?.roomFeatures?.insightsFeatures
        ?.chatTranslationFeatures;
    if (chatTranslationFeatures && chatTranslationFeatures.isEnabled) {
      // we'll get our selected lang
      const selectedChatTransLang = state.roomSettings.selectedChatTransLang;
      if (selectedChatTransLang !== '') {
        // we'll need to send request to get translation of selected lang
        const body = create(InsightsTranslateTextReqSchema, {
          text: chatMessage.message,
          sourceLang: selectedChatTransLang,
          targetLangs: chatTranslationFeatures.allowedTransLangs,
        });
        const res = await executeChatTranslation(body);
        if (res.status && res.result) {
          chatMessage.sourceLang = selectedChatTransLang;
          chatMessage.translations = res.result.translations;
        } else {
          console.error(res.msg);
        }
      }
    }

    let payload: Uint8Array = toBinary(ChatMessageSchema, chatMessage);

    if (this._enableE2EEChat) {
      const data = await this.encryptData(payload);
      if (typeof data === 'undefined') {
        return;
      }
      payload = data;
    }

    if (isPrivate) {
      this.sendPrivateData(payload, 'CHAT', to, false);
    } else {
      const subject = `${this._subjects.chat}.${this._roomId}`;
      this.messageQueue.addToQueue({
        subject,
        payload,
      });
    }

    if (isPrivate) {
      this.sendAnalyticsData(
        AnalyticsEvents.ANALYTICS_EVENT_USER_PRIVATE_CHAT,
        AnalyticsEventType.USER,
        '',
        '',
        '1',
      );
    } else {
      this.sendAnalyticsData(
        AnalyticsEvents.ANALYTICS_EVENT_USER_PUBLIC_CHAT,
        AnalyticsEventType.USER,
        '',
        '',
        '1',
      );
    }

    // to add own message
    await this.subscriptionHandler.handleChat.handleMsg(chatMessage);
  };

  /**
   * Sends whiteboard data as a fire-and-forget message.
   * This method uses the core NATS `publish` method via the `MessageQueue`
   * to avoid blocking critical messages.
   */
  public sendWhiteboardData = async (
    type: DataMsgBodyType,
    msg: string,
    to?: string,
  ) => {
    if (!this._nc || this._nc.isClosed()) {
      return;
    }

    const data = create(DataChannelMessageSchema, {
      type,
      fromUserId: this._userId,
      toUserId: to,
      message: msg,
    });

    let payload: Uint8Array = toBinary(DataChannelMessageSchema, data);
    if (this._enableE2EEWhiteboard) {
      const data = await this.encryptData(payload);
      if (typeof data === 'undefined') {
        return; // Don't send if encryption fails
      }
      payload = data;
    }

    const subject = `${this._subjects.whiteboard}.${this._roomId}`;
    this.messageQueue.addToQueue({
      subject,
      payload,
    });
  };

  /**
   * Sends a generic data message.
   * Private messages are sent via the system worker with JetStream's guaranteed delivery.
   * Public messages are sent as fire-and-forget core NATS messages to the public data channel subject.
   * Both are managed by the MessageQueue.
   */
  public sendDataMessage = async (
    type: DataMsgBodyType,
    msg: string,
    to?: string,
  ) => {
    if (!this._nc || this._nc.isClosed()) {
      return;
    }

    const data = create(DataChannelMessageSchema, {
      type,
      fromUserId: this._userId,
      toUserId: to,
      message: msg,
    });

    let payload: Uint8Array = toBinary(DataChannelMessageSchema, data);
    if (this._enableE2EE) {
      const data = await this.encryptData(payload);
      if (typeof data === 'undefined') {
        return;
      }
      payload = data;
    }

    if (to) {
      this.sendPrivateData(payload, 'DATA_MSG', to, false);
    } else {
      const subject = `${this._subjects.dataChannel}.${this._roomId}`;
      this.messageQueue.addToQueue({
        subject,
        payload,
      });
    }
  };

  /**
   * Sends analytics data to the server as a lightweight, fire-and-forget message.
   * This method uses the core NATS subject `systemCoreWorker` via the `MessageQueue`
   */
  public sendAnalyticsData = (
    event_name: AnalyticsEvents,
    event_type: AnalyticsEventType = AnalyticsEventType.USER,
    hset_value?: string,
    event_value_string?: string,
    event_value_integer?: string,
  ) => {
    const analyticsMsg = create(AnalyticsDataMsgSchema, {
      eventType: event_type,
      eventName: event_name,
      roomId: this._roomId,
      userId: this._userId,
      hsetValue: hset_value,
      eventValueString: event_value_string,
      eventValueInteger: event_value_integer,
    });

    const data = create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.PUSH_ANALYTICS_DATA,
      msg: toJsonString(AnalyticsDataMsgSchema, analyticsMsg),
    });

    const subject =
      this._subjects.systemCoreWorker + '.' + this._roomId + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(NatsMsgClientToServerSchema, data),
    });
  };

  private startTokenRenewInterval() {
    if (this.tokenRenewInterval) {
      return;
    }
    this.tokenRenewInterval = setInterval(() => {
      this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.REQ_RENEW_PNM_TOKEN,
          msg: this._token,
        }),
      );
    }, RENEW_TOKEN_FREQUENT);
  }

  public handlePong() {
    this.missedPongs = 0;
    if (this.pongMissedToastId) {
      toast.dismiss(this.pongMissedToastId);
      this.pongMissedToastId = undefined;
    }
  }

  private startPingToServer() {
    if (this.pingInterval) {
      // Already running, no need to start another.
      return;
    }
    const ping = async () => {
      if (this.missedPongs === 6) {
        this.pongMissedToastId = toast.loading(
          i18n.t('notifications.server-not-responding'),
          {
            type: 'warning',
            closeButton: false,
            autoClose: false,
          },
        );
      } else if (this.missedPongs >= MAX_MISSED_PONGS) {
        await this.endSession(
          'notifications.room-disconnected-server-unresponsive',
        );
        return;
      }

      this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.PING,
        }),
      );
      this.missedPongs++;
    };
    this.pingInterval = setInterval(ping, PING_INTERVAL);
    // start instantly
    ping().then();
  }

  public startUsersSync = () => {
    if (this.reconciliationInterval) {
      return;
    }
    this.reconciliationInterval = setInterval(() => {
      this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.REQ_ONLINE_USERS_LIST,
        }),
      );
    }, USERS_SYNC_INTERVAL);
  };

  /**
   * Finalizes the application connection.
   * This method should be called when the application is ready
   * to establish the full connection, typically after receiving approval to join the room.
   * Calling this method prematurely may result in the media server token expiring before it is used.
   */
  public finalizeAppConn = () => {
    // Request for users' list to prepare everything
    this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_JOINED_USERS_LIST,
      }),
    );
  };

  public async initializeMediaServer(
    e2ee: EndToEndEncryptionFeatures | undefined,
    roomSid: string,
  ) {
    if (typeof this._mediaServerConn !== 'undefined') {
      return false;
    }
    let encryptionKey: string | undefined = undefined;

    if (e2ee && e2ee.isEnabled) {
      if (!isE2EESupported()) {
        this.setErrorStatus(
          i18n.t('notifications.e2ee-unsupported-browser-title'),
          i18n.t('notifications.e2ee-unsupported-browser-msg'),
        );
        return false;
      }

      encryptionKey = e2ee.encryptionKey;
      if (e2ee.enabledSelfInsertEncryptionKey) {
        encryptionKey = store.getState().roomSettings.selfInsertedE2EESecretKey;
        // clean as soon as we've done with it
        store.dispatch(addSelfInsertedE2EESecretKey(''));
      }

      if (encryptionKey) {
        await importSecretKeyFromPlainText(encryptionKey, roomSid);

        this._enableE2EE = true;
        this._enableE2EEChat = e2ee.includedChatMessages;
        this._enableE2EEWhiteboard = e2ee.includedWhiteboard;
      } else {
        this.setErrorStatus(
          i18n.t('notifications.e2ee-invalid-key-title'),
          i18n.t('notifications.e2ee-invalid-key-msg'),
        );
        return false;
      }
    }

    this._mediaServerConn = createLivekitConnection(
      this._setErrorState,
      this._setRoomConnectionStatusState,
      this._userId,
      this._enableE2EE,
      encryptionKey,
    );

    this._setCurrentMediaServerConn(this._mediaServerConn);
    return true;
  }
}
