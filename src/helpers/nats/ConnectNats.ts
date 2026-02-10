import { Dispatch } from 'react';
import {
  AnalyticsDataMsgSchema,
  AnalyticsEvents,
  AnalyticsEventType,
  ChatMessage,
  ChatMessageSchema,
  DataChannelMessageSchema,
  DataMsgBodyType,
  EndToEndEncryptionFeatures,
  InsightsTranslateTextReqSchema,
  MediaServerConnInfoSchema,
  NatsInitialData,
  NatsInitialDataSchema,
  NatsKvUserInfoSchema,
  NatsMsgClientToServer,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  NatsMsgServerToClient,
  NatsMsgServerToClientEvents,
  NatsMsgServerToClientSchema,
  NatsSubjects,
  PrivateDataDeliverySchema,
} from 'plugnmeet-protocol-js';
import {
  create,
  fromBinary,
  fromJson,
  fromJsonString,
  toBinary,
  toJsonString,
} from '@bufbuild/protobuf';
import { toast } from 'react-toastify';
import {
  NatsConnection,
  tokenAuthenticator,
  wsconnect,
} from '@nats-io/nats-core';
import { jetstream, JetStreamClient } from '@nats-io/jetstream';
import { isE2EESupported } from 'livekit-client';

import { IErrorPageProps } from '../../components/extra-pages/Error';
import { IConnectLivekit } from '../livekit/types';
import HandleRoomData from './HandleRoomData';
import HandleParticipants from './HandleParticipants';
import HandleDataMessage from './HandleDataMessage';
import HandleWhiteboard from './HandleWhiteboard';
import HandleChat from './HandleChat';
import { store } from '../../store';
import HandleSystemData from './HandleSystemData';
import i18n from '../i18n';
import { addToken } from '../../store/slices/sessionSlice';
import MessageQueue from './MessageQueue';
import {
  decryptDataFromUint8Array,
  encryptDataToUint8Array,
  importSecretKeyFromPlainText,
} from '../libs/cryptoMessages';
import { ICurrentRoom } from '../../store/slices/interfaces/session';
import {
  formatNatsError,
  getChatDonors,
  getWhiteboardDonors,
  isUserRecorder,
  isValidHttpUrl,
  randomString,
} from '../utils';
import {
  addSelfInsertedE2EESecretKey,
  addUserNotification,
  setAllUserNotifications,
  updateIsNatsServerConnected,
} from '../../store/slices/roomSettingsSlice';
import { roomConnectionStatus } from '../../components/app/helper';
import { destroyAudioManager } from '../libs/AudioActivityManager';
import {
  DB_STORE_NAMES,
  deleteRoomDB,
  idbGet,
  idbGetAll,
  initIDB,
} from '../libs/idb';
import { addAllChatMessages } from '../../store/slices/chatMessagesSlice';
import { UserNotification } from '../../store/slices/interfaces/roomSettings';
import {
  SELECTED_SUBTITLE_LANG_KEY,
  TextWithInfo,
} from '../../store/slices/interfaces/speechServices';
import { setSpeechToTextLastFinalTexts } from '../../store/slices/speechServicesSlice';
import { createLivekitConnection } from '../livekit/utils';
import { executeChatTranslation } from '../../components/translation-transcription/helpers/apiConnections';

const RENEW_TOKEN_FREQUENT = 3 * 60 * 1000,
  PING_INTERVAL = 10 * 1000,
  STATUS_CHECKER_INTERVAL = 500,
  USERS_SYNC_INTERVAL = 30 * 1000,
  MAX_MISSED_PONGS = 3;
type PrivateDataDeliveryType = 'CHAT' | 'DATA_MSG';

export default class ConnectNats {
  private _nc: NatsConnection | undefined;
  private _js: JetStreamClient | undefined;
  private readonly _natsWSUrls: string[];
  private _token: string;
  private _enableE2EE: boolean = false;
  private _enableE2EEChat: boolean = false;
  private _enableE2EEWhiteboard: boolean = false;
  private toastIdConnecting: any = undefined;

  private readonly _roomId: string;
  private readonly _userId: string;
  private _userName: string = '';
  private _isAdmin: boolean = false;
  private _isRecorder: boolean = false;
  private readonly _roomStreamName: string;
  private readonly _subjects: NatsSubjects;
  // this value won't be updated
  // so, don't use it for metadata those will be updated
  private _currentRoomInfo: ICurrentRoom | undefined;

  private tokenRenewInterval: any;
  private pingInterval: any;
  private statusCheckerInterval: any;
  private reconciliationInterval: any;
  private missedPongs = 0;
  private pongMissedToastId: any;
  private isRoomReconnecting: boolean = false;

  private readonly _setErrorState: Dispatch<IErrorPageProps>;
  private readonly _setRoomConnectionStatusState: Dispatch<roomConnectionStatus>;
  private readonly _setCurrentMediaServerConn: Dispatch<IConnectLivekit>;

  private _mediaServerConn: IConnectLivekit | undefined = undefined;
  private messageQueue: MessageQueue;
  private handleRoomData: HandleRoomData;
  private handleSystemData: HandleSystemData;
  private handleParticipants: HandleParticipants;
  private handleChat: HandleChat;
  private handleDataMsg: HandleDataMessage;
  private handleWhiteboard: HandleWhiteboard;

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
    this._roomStreamName = roomStreamName;
    this._subjects = subjects;
    this._setErrorState = setErrorState;
    this._setRoomConnectionStatusState = setRoomConnectionStatusState;
    this._setCurrentMediaServerConn = setCurrentMediaServerConn;

    this.messageQueue = new MessageQueue();
    this.handleRoomData = new HandleRoomData(roomId, userId);
    this.handleSystemData = new HandleSystemData(userId);
    this.handleParticipants = new HandleParticipants(this);
    this.handleChat = new HandleChat(this);
    this.handleDataMsg = new HandleDataMessage(this);
    this.handleWhiteboard = new HandleWhiteboard();
  }

  get isAdmin(): boolean {
    return this._isAdmin;
  }

  get roomId(): string {
    return this._roomId;
  }

  get userId(): string {
    return this._userId;
  }

  get userName(): string {
    return this._userName;
  }

  get isRecorder(): boolean {
    return this._isRecorder;
  }

  get mediaServerConn(): IConnectLivekit | undefined {
    return this._mediaServerConn;
  }

  public openConn = async () => {
    try {
      this._nc = await wsconnect({
        servers: this._natsWSUrls,
        authenticator: tokenAuthenticator(() => this._token),
        pingInterval: PING_INTERVAL,
      });

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
    this._isRecorder = isUserRecorder(this.userId);
    this._js = jetstream(this._nc);
    this.messageQueue.setJs(this._js);
    this.messageQueue.setIsConnected(true);

    // now change status to connected
    store.dispatch(updateIsNatsServerConnected(true));
    // start monitoring connection
    this.monitorConnStatus().then();

    // now we'll subscribe to the room events stream
    this.subscribeToRoomEvents().then();
    // we'll still need this for any pub/sub based messages
    this.subscribeToSystemPublicPubSub().then();

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
    this._setErrorState({
      title: i18n.t('notifications.room-disconnected-title'),
      text: i18n.t(msg),
    });
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
    this.handleParticipants.clearParticipantCounterInterval();

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

  private setErrorStatus(title: string, reason: string) {
    this._setRoomConnectionStatusState('error');
    this._setErrorState({
      title: title,
      text: reason,
    });
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
   * Subscribes to the single user consumer on the main room stream.
   * This one subscription will handle all JetStream-based messages for the user,
   * @private
   */
  private async subscribeToRoomEvents() {
    if (typeof this._js === 'undefined') {
      return;
    }
    const consumerName = `${this._roomId}_${this._userId}`;
    const consumer = await this._js.consumers.get(
      this._roomStreamName,
      consumerName,
    );
    const sub = await consumer.consume();

    for await (const m of sub) {
      try {
        const payload = fromBinary(NatsMsgServerToClientSchema, m.data);
        if (payload.event === NatsMsgServerToClientEvents.SESSION_ENDED) {
          m.ack(); // Ack early before the session ends
        }
        await this.handleSystemEvents(payload);
        m.ack();
      } catch (e) {
        const err = e as Error;
        console.error(err.message);
        m.nak();
      }
    }
  }

  /**
   * All the system public events send by core pub/sub
   * this channel is different from the JS stream
   */
  private async subscribeToSystemPublicPubSub() {
    if (!this._nc) {
      return;
    }

    const subject = `${this._subjects.systemPublic}.${this._roomId}`;
    const sub = this._nc.subscribe(subject);

    for await (const m of sub) {
      const payload = fromBinary(NatsMsgServerToClientSchema, m.data);
      await this.handleSystemEvents(payload);
    }
  }

  public sendMessageToSystemWorker = (data: NatsMsgClientToServer) => {
    const subject =
      this._subjects.systemJsWorker + '.' + this._roomId + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(NatsMsgClientToServerSchema, data),
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

  private handlePrivateDataDelivery(p: NatsMsgServerToClient) {
    const header = fromJsonString(PrivateDataDeliverySchema, p.msg);
    if ((header.type as PrivateDataDeliveryType) === 'CHAT') {
      this.processToHandleChatMsg(p.binMsg).then();
    } else if ((header.type as PrivateDataDeliveryType) === 'DATA_MSG') {
      this.processToHandleDataMsg(p.binMsg).then();
    }
  }

  private async encryptData(payload: Uint8Array) {
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

  private async decryptData(payload: Uint8Array) {
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

  private async processToHandleChatMsg(data: Uint8Array<ArrayBufferLike>) {
    let dataToParse = data;
    if (this._enableE2EEChat) {
      const data = await this.decryptData(dataToParse);
      if (typeof data === 'undefined') {
        return;
      }
      dataToParse = data;
    }
    const payload = fromBinary(ChatMessageSchema, dataToParse);
    await this.handleChat.handleMsg(payload);
  }

  /**
   * All the events related with chat will be handled here,
   * including public and private
   */
  private async subscribeToChat() {
    if (!this._nc) {
      return;
    }
    const subject = `${this._subjects.chat}.${this._roomId}`;
    const sub = this._nc.subscribe(subject);

    const donors = getChatDonors();
    for (let i = 0; i < donors.length; i++) {
      this.sendDataMessage(
        DataMsgBodyType.REQ_PUBLIC_CHAT_DATA,
        '',
        donors[i].userId,
      ).then();
    }

    for await (const m of sub) {
      await this.processToHandleChatMsg(m.data);
    }
  }

  public sendChatMsg = async (to: string, msg: string) => {
    if (!this._nc) {
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
      this.sendPrivateData(payload, 'CHAT', to, true);
    } else {
      const subject = `${this._subjects.chat}.${this._roomId}`;
      this._nc.publish(subject, payload);
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
  };

  /**
   * Subscribes to the room's whiteboard channel using NATS Core Pub/Sub for low latency.
   */
  private async subscribeToWhiteboard() {
    if (!this._nc) {
      return;
    }
    const subject = `${this._subjects.whiteboard}.${this._roomId}`;
    const sub = this._nc.subscribe(subject);

    const donors = getWhiteboardDonors();
    for (let i = 0; i < donors.length; i++) {
      this.sendDataMessage(
        DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA,
        '',
        donors[i].userId,
      ).then();
    }

    for await (const m of sub) {
      let dataToParse = m.data;
      if (this._enableE2EEWhiteboard) {
        const data = await this.decryptData(dataToParse);
        if (typeof data === 'undefined') {
          continue; // Skip if decryption fails
        }
        dataToParse = data;
      }
      const payload = fromBinary(DataChannelMessageSchema, dataToParse);
      // Still need to check if the message is from the local user to avoid echo.
      if (payload.fromUserId !== this._userId) {
        await this.handleWhiteboard.handleWhiteboardMsg(payload);
      }
    }
  }

  public sendWhiteboardData = async (
    type: DataMsgBodyType,
    msg: string,
    to?: string,
  ) => {
    if (!this._nc) {
      console.error('NATS connection not available to send whiteboard data.');
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
    this._nc.publish(subject, payload);
  };

  private async processToHandleDataMsg(data: Uint8Array<ArrayBufferLike>) {
    let dataToParse = data;
    if (this._enableE2EE) {
      const data = await this.decryptData(dataToParse);
      if (typeof data === 'undefined') {
        return;
      }
      dataToParse = data;
    }
    const payload = fromBinary(DataChannelMessageSchema, dataToParse);
    // Don't process our own messages or private messages for others.
    if (
      payload.fromUserId === this._userId ||
      (payload.toUserId && payload.toUserId !== this._userId)
    ) {
      return;
    }

    // All other messages are for us
    await this.handleDataMsg.handleMessage(payload);
  }

  /**
   * Subscribes to the room's data channel using NATS Core Pub/Sub for low latency.
   * Mostly with client to client
   */
  private async subscribeToDataChannel() {
    if (!this._nc) {
      return;
    }

    const subject = `${this._subjects.dataChannel}.${this._roomId}`;
    const sub = this._nc.subscribe(subject);

    for await (const m of sub) {
      await this.processToHandleDataMsg(m.data);
    }
  }

  /**
   * sendDataMessage method mostly use to communicate between clients
   */
  public sendDataMessage = async (
    type: DataMsgBodyType,
    msg: string,
    to?: string,
  ) => {
    if (!this._nc) {
      console.error('NATS connection not available to send data message.');
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
      this._nc.publish(subject, payload);
    }
  };

  /**
   * systemEventHandlers maps will contain all the events both public and private
   */
  private readonly systemEventHandlers: {
    [key in NatsMsgServerToClientEvents]?: (
      payload: NatsMsgServerToClient,
    ) => void | Promise<void>;
  } = {
    [NatsMsgServerToClientEvents.RES_INITIAL_DATA]: async (p) => {
      await this.handleInitialData(p.msg);
      this._setRoomConnectionStatusState('ready');
    },
    [NatsMsgServerToClientEvents.RES_MEDIA_SERVER_DATA]: async (p) => {
      await this.handleMediaServerData(p.msg);
    },
    [NatsMsgServerToClientEvents.RES_JOINED_USERS_LIST]: (p) =>
      this.handleJoinedUsersList(p.msg),
    [NatsMsgServerToClientEvents.RESP_ONLINE_USERS_LIST]: (p) =>
      this.handleParticipants.reconcileParticipants(p.msg),
    [NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE]: (p) =>
      this.handleRoomData.updateRoomMetadata(p.msg),
    [NatsMsgServerToClientEvents.RESP_RENEW_PNM_TOKEN]: (p) => {
      this._token = p.msg.toString();
      store.dispatch(addToken(this._token));
    },
    [NatsMsgServerToClientEvents.SYSTEM_NOTIFICATION]: (p) => {
      !this._isRecorder && this.handleSystemData.handleNotification(p.msg);
    },
    [NatsMsgServerToClientEvents.USER_JOINED]: (p) =>
      this.handleParticipants.addRemoteParticipant(p.msg),
    [NatsMsgServerToClientEvents.USER_DISCONNECTED]: (p) =>
      this.handleParticipants.handleParticipantDisconnected(p.msg),
    [NatsMsgServerToClientEvents.USER_OFFLINE]: (p) =>
      this.handleParticipants.handleParticipantOffline(p.msg),
    [NatsMsgServerToClientEvents.USER_METADATA_UPDATE]: (p) =>
      this.handleParticipants.handleParticipantMetadataUpdate(p.msg),
    [NatsMsgServerToClientEvents.SESSION_ENDED]: (p) => this.endSession(p.msg),
    [NatsMsgServerToClientEvents.POLL_CREATED]: (p) =>
      this.handleSystemData.handlePoll(p),
    [NatsMsgServerToClientEvents.POLL_CLOSED]: (p) =>
      this.handleSystemData.handlePoll(p),
    [NatsMsgServerToClientEvents.JOIN_BREAKOUT_ROOM]: (p) =>
      this.handleSystemData.handleBreakoutRoom(p),
    [NatsMsgServerToClientEvents.BREAKOUT_ROOM_ENDED]: (p) =>
      this.handleSystemData.handleBreakoutRoom(p),
    [NatsMsgServerToClientEvents.SYSTEM_CHAT_MSG]: (p) =>
      this.handleSystemData.handleSysChatMsg(p.msg),
    [NatsMsgServerToClientEvents.TRANSCRIPTION_OUTPUT_TEXT]: (p) =>
      this.handleDataMsg.handleSpeechSubtitleText(p.msg),
    [NatsMsgServerToClientEvents.RESP_INSIGHTS_AI_TEXT_CHAT]: (p) =>
      this.handleSystemData.handleInsightsAITextData(p.msg),
    [NatsMsgServerToClientEvents.DELIVERY_PRIVATE_DATA]: (p) =>
      this.handlePrivateDataDelivery(p),
    [NatsMsgServerToClientEvents.PONG]: () => this.handlePong(),
  };

  /**
   * Handle system events
   * @param payload
   * @private
   */
  private async handleSystemEvents(payload: NatsMsgServerToClient) {
    const handler = this.systemEventHandlers[payload.event];
    if (handler) {
      await handler(payload);
    }
  }

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
    this.sendMessageToSystemWorker(data);
  };

  private startTokenRenewInterval() {
    this.tokenRenewInterval = setInterval(() => {
      this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.REQ_RENEW_PNM_TOKEN,
          msg: this._token,
        }),
      );
    }, RENEW_TOKEN_FREQUENT);
  }

  private handlePong() {
    this.missedPongs = 0;
    if (this.pongMissedToastId) {
      toast.dismiss(this.pongMissedToastId);
      this.pongMissedToastId = undefined;
    }
  }

  private startPingToServer() {
    const ping = async () => {
      if (this.missedPongs === 1) {
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

  private startUsersSync = () => {
    this.reconciliationInterval = setInterval(() => {
      this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.REQ_ONLINE_USERS_LIST,
        }),
      );
    }, USERS_SYNC_INTERVAL);
  };

  private async handleInitialData(msg: string) {
    // 1. We'll try to decode the message.
    let data: NatsInitialData;
    try {
      data = fromJsonString(NatsInitialDataSchema, msg, {
        ignoreUnknownFields: true,
      });
    } catch (e: any) {
      console.error(e);
      this.setErrorStatus(
        i18n.t('notifications.decode-error-title'),
        i18n.t('notifications.decode-error-body'),
      );
      return;
    }

    // 2. We'll check if the data is valid.
    if (!data.room || !data.localUser) {
      this.setErrorStatus(
        i18n.t('notifications.decode-error-title'),
        i18n.t('notifications.invalid-missing-data'),
      );
      return;
    }

    // 3. We'll add the room info.
    this._currentRoomInfo = await this.handleRoomData.setRoomInfo(data.room);

    // 4. We'll initialize the indexedDB for this session.
    initIDB(this._currentRoomInfo.sid, this._userId);

    // 5. We'll add the local user.
    this._isAdmin = data.localUser.isAdmin;
    const localUser = await this.handleParticipants.addLocalParticipantInfo(
      data.localUser,
    );
    this._userName = localUser.name;

    // 6. We'll initialize the media server class.
    await this.initializeMediaServer(
      this._currentRoomInfo.metadata?.roomFeatures?.endToEndEncryptionFeatures,
      data.room.roomSid,
    );
  }

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

  private async handleJoinedUsersList(msg: string) {
    try {
      const onlineUsers: string[] = JSON.parse(msg);
      for (let i = 0; i < onlineUsers.length; i++) {
        const user = fromJson(NatsKvUserInfoSchema, onlineUsers[i], {
          ignoreUnknownFields: true,
        });
        await this.handleParticipants.addRemoteParticipant(user);
      }
      await this.onAfterUserReady();
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * This method is called after the current user has received the initial data
   * and the list of online users. It performs final setup tasks to make the
   * user fully operational in the room.
   */
  private async onAfterUserReady() {
    // Request for media server connection data
    this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_MEDIA_SERVER_DATA,
      }),
    );

    // Restore user data from IndexedDB to maintain state across sessions.
    try {
      const [
        chatMsgs,
        notifications,
        lastSubtitleLang,
        speechToTextFinalTexts,
      ] = await Promise.all([
        idbGetAll<ChatMessage>(DB_STORE_NAMES.CHAT_MESSAGES),
        idbGetAll<UserNotification>(DB_STORE_NAMES.USER_NOTIFICATIONS),
        idbGet<string>(
          DB_STORE_NAMES.USER_SETTINGS,
          SELECTED_SUBTITLE_LANG_KEY,
        ),
        idbGetAll<TextWithInfo>(DB_STORE_NAMES.SPEECH_TO_TEXT_FINAL_TEXTS),
      ]);

      if (chatMsgs.length) {
        store.dispatch(
          addAllChatMessages({
            messages: chatMsgs,
            currentUserId: this._userId,
          }),
        );
      }
      if (notifications.length) {
        store.dispatch(setAllUserNotifications(notifications));
      }
      // Restore speech-to-text data if the feature is enabled.
      const transcriptionFeatures =
        this._currentRoomInfo?.metadata?.roomFeatures?.insightsFeatures
          ?.transcriptionFeatures;
      if (
        transcriptionFeatures?.isEnabled &&
        speechToTextFinalTexts &&
        speechToTextFinalTexts.length
      ) {
        let subtitleLang = lastSubtitleLang;
        if (!lastSubtitleLang) {
          subtitleLang = transcriptionFeatures.defaultSubtitleLang;
        }
        store.dispatch(
          setSpeechToTextLastFinalTexts({
            selectedSubtitleLang: subtitleLang as string,
            lastFinalTexts: speechToTextFinalTexts,
          }),
        );
      }
    } catch (e) {
      console.error('Failed to load data from IndexedDB on startup:', e);
    }

    // Subscribe to real-time data channels.
    // These subscriptions are set up after initial data is loaded to ensure
    // that all necessary user and room information is available.
    Promise.all([
      this.subscribeToChat(),
      this.subscribeToWhiteboard(),
      this.subscribeToDataChannel(),
    ]).then();

    if (this._isRecorder) {
      this.handleParticipants.recorderJoined();
    }

    this.startUsersSync();
  }

  /**
   * handleMediaServerData will decode data and connect with media server
   * @param msg
   */
  private async handleMediaServerData(msg: string) {
    try {
      const serverInfo = fromJsonString(MediaServerConnInfoSchema, msg);
      if (this.mediaServerConn) {
        await this.mediaServerConn.initializeConnection(
          serverInfo.url,
          serverInfo.token,
        );
      }
    } catch (e: any) {
      console.error(e);
      this.setErrorStatus(
        i18n.t('notifications.decode-error-title'),
        i18n.t('notifications.decode-error-body'),
      );
      return;
    }
  }

  private async initializeMediaServer(
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
