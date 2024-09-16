import { isE2EESupported } from 'livekit-client';
import { Dispatch } from 'react';
import {
  AnalyticsDataMsgSchema,
  AnalyticsEvents,
  AnalyticsEventType,
  ChatMessageSchema,
  DataChannelMessageSchema,
  DataMsgBodyType,
  MediaServerConnInfo,
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
  NatsError,
  wsconnect,
  tokenAuthenticator,
  // eslint-disable-next-line import/no-unresolved
} from '@nats-io/nats-core';
// eslint-disable-next-line import/no-unresolved
import { jetstream, JetStreamClient } from '@nats-io/jetstream';

import { IErrorPageProps } from '../../components/extra-pages/Error';
import {
  ConnectionStatus,
  IConnectLivekit,
  LivekitInfo,
} from '../livekit/types';
import { createLivekitConnection } from '../livekit/utils';
import HandleRoomData from './HandleRoomData';
import HandleParticipants from './HandleParticipants';
import HandleDataMessage from './HandleDataMessage';
import HandleWhiteboard from './HandleWhiteboard';
import HandleChat from './HandleChat';
import { store } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import HandleSystemData from './HandleSystemData';
import i18n from '../i18n';
import { addToken } from '../../store/slices/sessionSlice';
import MessageQueue from './MessageQueue';
import { encryptMessage } from '../cryptoMessages';
import { ICurrentRoom } from '../../store/slices/interfaces/session';

const RENEW_TOKEN_FREQUENT = 3 * 60 * 1000;
const PING_INTERVAL = 60 * 1000;
const STATUS_CHECKER_INTERVAL = 500;

export default class ConnectNats {
  private _nc: NatsConnection | undefined;
  private _js: JetStreamClient | undefined;
  private readonly _natsWSUrls: string[];
  private _token: string;

  private readonly _roomId: string;
  private readonly _userId: string;
  private _userName: string = '';
  private _isAdmin: boolean = false;
  private _isRecorder: boolean = false;
  private readonly _subjects: NatsSubjects;
  // this value won't be updated
  // so, don't use it for metadata those will be updated
  private _currentRoomInfo: ICurrentRoom | undefined;

  private tokenRenewInterval: any;
  private pingInterval: any;
  private statusCheckerInterval: any;
  private isRoomReconnecting: boolean = false;

  private readonly _setErrorState: Dispatch<IErrorPageProps>;
  private readonly _setRoomConnectionStatusState: Dispatch<ConnectionStatus>;
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
    subjects: NatsSubjects,
    setErrorState: Dispatch<IErrorPageProps>,
    setRoomConnectionStatusState: Dispatch<ConnectionStatus>,
    setCurrentMediaServerConn: Dispatch<IConnectLivekit>,
  ) {
    this._natsWSUrls = natsWSUrls;
    this._token = token;
    this._roomId = roomId;
    this._userId = userId;
    this._subjects = subjects;
    this._setErrorState = setErrorState;
    this._setRoomConnectionStatusState = setRoomConnectionStatusState;
    this._setCurrentMediaServerConn = setCurrentMediaServerConn;

    this.messageQueue = new MessageQueue();
    this.handleRoomData = new HandleRoomData();
    this.handleSystemData = new HandleSystemData();
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
      });

      console.info(`connected ${this._nc.getServer()}`);
    } catch (e) {
      console.error(e);
      this.setErrorStatus(
        i18n.t('notifications.nats-error-auth-title'),
        i18n.t('nats-error-auth-body'),
      );
      return;
    }

    this._setRoomConnectionStatusState('receiving-data');
    this._isRecorder = this.handleParticipants.isRecorder(this.userId);
    this._js = jetstream(this._nc);
    this.messageQueue.js(this._js);

    this.monitorConnStatus().then();

    // now we'll subscribe to the system only
    // others will be done after received initial data
    this.subscribeToSystemPrivate().then();
    this.subscribeToSystemPublic().then();

    this.startTokenRenewInterval();
    await this.startPingToServer();

    // request for initial data
    await this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_INITIAL_DATA,
      }),
    );
  };

  public endSession = async (msg: string) => {
    if (this.mediaServerConn) {
      await this.mediaServerConn.disconnectRoom(true);
    }

    clearInterval(this.tokenRenewInterval);
    clearInterval(this.pingInterval);
    this.handleParticipants.clearParticipantCounterInterval();

    if (this._nc && !this._nc.isClosed()) {
      await this._nc.drain();
      await this._nc.close();
    }
    this.messageQueue.isConnected(false);

    this._setErrorState({
      title: i18n.t('notifications.room-disconnected-title'),
      text: i18n.t(msg),
    });
    this._setRoomConnectionStatusState('disconnected');
  };

  public sendMessageToSystemWorker = async (data: NatsMsgClientToServer) => {
    const subject =
      this._subjects.systemJsWorker + '.' + this._roomId + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(NatsMsgClientToServerSchema, data),
    });
  };

  public sendChatMsg = async (to: string, msg: string) => {
    const e2ee =
      this._currentRoomInfo?.metadata?.roomFeatures?.endToEndEncryptionFeatures;
    if (
      e2ee &&
      e2ee.isEnabled &&
      e2ee.includedChatMessages &&
      e2ee.encryptionKey
    ) {
      try {
        msg = await encryptMessage(e2ee.encryptionKey, msg);
      } catch (e: any) {
        toast('Encryption error: ' + e.message, {
          type: 'error',
        });
        console.error('Encryption error:' + e.message);
        return;
      }
    }

    const isPrivate = to !== 'public';
    const now = Date.now().toString();
    const data = create(ChatMessageSchema, {
      id: now,
      fromName: this._userName,
      fromUserId: this._userId,
      sentAt: now,
      toUserId: to !== 'public' ? to : undefined,
      isPrivate: isPrivate,
      message: msg,
      fromAdmin: this.isAdmin,
    });

    const subject =
      this._roomId + ':' + this._subjects.chat + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(ChatMessageSchema, data),
    });

    if (isPrivate) {
      this.sendAnalyticsData(
        AnalyticsEvents.ANALYTICS_EVENT_USER_PRIVATE_CHAT,
        AnalyticsEventType.USER,
        '',
        '',
        '1',
      ).then();
    } else {
      this.sendAnalyticsData(
        AnalyticsEvents.ANALYTICS_EVENT_USER_PUBLIC_CHAT,
        AnalyticsEventType.USER,
        '',
        '',
        '1',
      ).then();
    }
  };

  public sendWhiteboardData = async (
    type: DataMsgBodyType,
    msg: string,
    to?: string,
  ) => {
    const data = create(DataChannelMessageSchema, {
      type,
      fromUserId: this._userId,
      toUserId: to,
      message: msg,
    });

    const subject =
      this._roomId + ':' + this._subjects.whiteboard + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(DataChannelMessageSchema, data),
    });
  };

  public sendDataMessage = async (
    type: DataMsgBodyType,
    msg: string,
    to?: string,
  ) => {
    const data = create(DataChannelMessageSchema, {
      type,
      fromUserId: this._userId,
      toUserId: to,
      message: msg,
    });

    const subject =
      this._roomId + ':' + this._subjects.dataChannel + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(DataChannelMessageSchema, data),
    });
  };

  public sendAnalyticsData = async (
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
    await this.sendMessageToSystemWorker(data);
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
            this.messageQueue.isConnected(false);
            this.endSession('notifications.room-disconnected-network-error');

            clearInterval(this.statusCheckerInterval);
            this.statusCheckerInterval = undefined;
            this.isRoomReconnecting = false;
          }
        }, STATUS_CHECKER_INTERVAL);
      }
    };

    for await (const s of this._nc.status()) {
      if (s.type === 'reconnecting' && !this.isRoomReconnecting) {
        this.isRoomReconnecting = true;
        startStatusChecker();
        this._setRoomConnectionStatusState('re-connecting');
      } else if (s.type === 'reconnect') {
        this._setRoomConnectionStatusState('connected');

        clearInterval(this.statusCheckerInterval);
        this.statusCheckerInterval = undefined;
        this.isRoomReconnecting = false;
      }
    }
  }

  private async subscribeToSystemPrivate() {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = this._subjects.systemPrivate + ':' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);
    const sub = await consumer.consume();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const m of sub) {
      try {
        const payload = fromBinary(NatsMsgServerToClientSchema, m.data);
        await this.handleSystemEvents(payload);
      } catch (e) {
        const err = e as NatsError;
        console.error(err.message);
      }
      m.ack();
    }
  }

  private subscribeToSystemPublic = async () => {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = this._subjects.systemPublic + ':' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);
    const sub = await consumer.consume();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const m of sub) {
      try {
        const payload = fromBinary(NatsMsgServerToClientSchema, m.data);
        await this.handleSystemEvents(payload);
      } catch (e) {
        const err = e as NatsError;
        console.error(err.message);
      }
      m.ack();
    }
  };

  private subscribeToChat = async () => {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = this._subjects.chat + ':' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);
    const sub = await consumer.consume();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const m of sub) {
      try {
        const payload = fromBinary(ChatMessageSchema, m.data);
        await this.handleChat.handleMsg(payload);
      } catch (e) {
        const err = e as NatsError;
        console.error(err.message);
      }
      m.ack();
    }
  };

  private subscribeToWhiteboard = async () => {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = this._subjects.whiteboard + ':' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);
    const sub = await consumer.consume();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const m of sub) {
      try {
        const payload = fromBinary(DataChannelMessageSchema, m.data);
        // whiteboard data should not process by the same sender
        if (payload.fromUserId !== this._userId) {
          if (
            typeof payload.toUserId !== 'undefined' &&
            payload.toUserId !== this._userId
          ) {
            // receiver specified & this user was not the receiver
            // we'll not process further
            m.ack();
            continue;
          }
          await this.handleWhiteboard.handleWhiteboardMsg(payload);
        }
      } catch (e) {
        const err = e as NatsError;
        console.error(err.message);
      }
      m.ack();
    }
  };

  private subscribeToDataChannel = async () => {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = this._subjects.dataChannel + ':' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);
    const sub = await consumer.consume();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    for await (const m of sub) {
      try {
        const payload = fromBinary(DataChannelMessageSchema, m.data);
        if (
          typeof payload.toUserId !== 'undefined' &&
          payload.toUserId !== this._userId
        ) {
          // receiver specified & this user was not the receiver
          // we'll not process further
          m.ack();
          continue;
        }
        // fromUserId check inside handleMessage method
        await this.handleDataMsg.handleMessage(payload);
      } catch (e) {
        const err = e as NatsError;
        console.error(err.message);
      }
      m.ack();
    }
  };

  private async handleSystemEvents(payload: NatsMsgServerToClient) {
    switch (payload.event) {
      case NatsMsgServerToClientEvents.RES_INITIAL_DATA:
        await this.handleInitialData(payload.msg);
        this._setRoomConnectionStatusState('ready');
        break;
      case NatsMsgServerToClientEvents.JOINED_USERS_LIST:
        await this.handleJoinedUsersList(payload.msg);
        break;
      case NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE:
        await this.handleRoomData.updateRoomMetadata(payload.msg);
        break;
      case NatsMsgServerToClientEvents.RESP_RENEW_PNM_TOKEN:
        this._token = payload.msg.toString();
        store.dispatch(addToken(this._token));
        break;
      case NatsMsgServerToClientEvents.SYSTEM_NOTIFICATION:
        if (!this._isRecorder) {
          // no notification for recorder
          this.handleSystemData.handleNotification(payload.msg);
        }
        break;
      case NatsMsgServerToClientEvents.USER_JOINED:
        await this.handleParticipants.addRemoteParticipant(payload.msg);
        break;
      case NatsMsgServerToClientEvents.USER_DISCONNECTED:
        this.handleParticipants.handleParticipantDisconnected(payload.msg);
        break;
      case NatsMsgServerToClientEvents.USER_OFFLINE:
        this.handleParticipants.handleParticipantOffline(payload.msg);
        break;
      case NatsMsgServerToClientEvents.USER_METADATA_UPDATE:
        await this.handleParticipants.handleParticipantMetadataUpdate(
          payload.msg,
        );
        break;
      case NatsMsgServerToClientEvents.AZURE_COGNITIVE_SERVICE_SPEECH_TOKEN:
        this.handleSystemData.handleAzureToken(payload.msg);
        break;
      case NatsMsgServerToClientEvents.SESSION_ENDED:
        await this.endSession(payload.msg);
        break;
      case NatsMsgServerToClientEvents.POLL_CREATED:
      case NatsMsgServerToClientEvents.POLL_CLOSED:
        this.handleSystemData.handlePoll(payload);
        break;
      case NatsMsgServerToClientEvents.JOIN_BREAKOUT_ROOM:
      case NatsMsgServerToClientEvents.BREAKOUT_ROOM_ENDED:
        this.handleSystemData.handleBreakoutRoom(payload);
        break;
      case NatsMsgServerToClientEvents.SYSTEM_CHAT_MSG:
        this.handleSystemData.handleSysChatMsg(payload.msg);
        break;
    }
  }

  private startTokenRenewInterval() {
    this.tokenRenewInterval = setInterval(async () => {
      await this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.REQ_RENEW_PNM_TOKEN,
          msg: this._token,
        }),
      );
    }, RENEW_TOKEN_FREQUENT);
  }

  private async startPingToServer() {
    const ping = async () => {
      await this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.PING,
        }),
      );
    };
    this.pingInterval = setInterval(async () => {
      await ping();
    }, PING_INTERVAL);
    // start instantly
    await ping();
  }

  private async handleInitialData(msg: string) {
    let data: NatsInitialData;
    try {
      data = fromJsonString(NatsInitialDataSchema, msg);
    } catch (e: any) {
      console.error(e);
      this.setErrorStatus(
        i18n.t('notifications.decode-error-title'),
        i18n.t('decode-error-body'),
      );
      return;
    }

    // add room info first
    if (data.room) {
      this._currentRoomInfo = await this.handleRoomData.setRoomInfo(data.room);
    }

    // now local user
    if (data.localUser) {
      this._isAdmin = data.localUser.isAdmin;
      const localUser = await this.handleParticipants.addLocalParticipantInfo(
        data.localUser,
      );
      this._userName = localUser.name;
    }

    // media info
    if (data.mediaServerInfo) {
      await this.createMediaServerConn(data.mediaServerInfo);
    }

    // now subscribe to other channels
    // some of those services need user or room info
    // without proper data will give unexpected results,
    // for example, if E2EE is enabled then key will require
    // for chat or whiteboard
    this.subscribeToChat().then();
    this.subscribeToWhiteboard().then();
    this.subscribeToDataChannel().then();
  }

  private async handleJoinedUsersList(msg: string) {
    try {
      const onlineUsers: string[] = JSON.parse(msg);
      for (let i = 0; i < onlineUsers.length; i++) {
        const user = fromJson(NatsKvUserInfoSchema, onlineUsers[i]);
        await this.handleParticipants.addRemoteParticipant(user);
      }
      await this.onAfterUserReady();
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * This method should call when the current user is ready
   * with an initial data & users list
   */
  private async onAfterUserReady() {
    const participants = participantsSelector
      .selectAll(store.getState())
      .filter((participant) => participant.userId !== this._userId);

    if (!participants.length) return;
    participants.sort((a, b) => {
      return a.joinedAt - b.joinedAt;
    });
    const donor = participants[0];

    await this.sendDataMessage(
      DataMsgBodyType.REQ_INIT_WHITEBOARD_DATA,
      '',
      donor.userId,
    );
  }

  private async createMediaServerConn(connInfo: MediaServerConnInfo) {
    if (typeof this._mediaServerConn !== 'undefined') {
      return;
    }
    const info: LivekitInfo = {
      livekit_host: connInfo.url,
      token: connInfo.token,
    };

    const e2ee =
      this._currentRoomInfo?.metadata?.roomFeatures?.endToEndEncryptionFeatures;

    if (e2ee && e2ee.isEnabled && e2ee.encryptionKey) {
      if (!isE2EESupported()) {
        this.setErrorStatus(
          i18n.t('notifications.e2ee-unsupported-browser-title'),
          i18n.t('notifications.e2ee-unsupported-browser-msg'),
        );
        return;
      } else {
        info.enabledE2EE = true;
        info.encryption_key = e2ee.encryptionKey;
      }
    }

    const conn = createLivekitConnection(
      info,
      this._setErrorState,
      this._setRoomConnectionStatusState,
    );

    this._setCurrentMediaServerConn(conn);
    this._mediaServerConn = conn;
  }
}
