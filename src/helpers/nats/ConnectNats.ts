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
  wsconnect,
  tokenAuthenticator,
} from '@nats-io/nats-core';
import { jetstream, JetStreamClient, JsMsg } from '@nats-io/jetstream';
import { isURL } from 'validator';
import { isE2EESupported } from 'livekit-client';

import { IErrorPageProps } from '../../components/extra-pages/Error';
import { IConnectLivekit, LivekitInfo } from '../livekit/types';
import { createLivekitConnection } from '../livekit/utils';
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
  encryptMessage,
  importSecretKeyFromMaterial,
  importSecretKeyFromPlainText,
} from '../libs/cryptoMessages';
import { ICurrentRoom } from '../../store/slices/interfaces/session';
import { formatNatsError, getWhiteboardDonors, isUserRecorder } from '../utils';
import {
  addUserNotification,
  updateIsNatsServerConnected,
} from '../../store/slices/roomSettingsSlice';
import { roomConnectionStatus } from '../../components/app/helper';
import { audioActivityManager } from '../libs/AudioActivityManager';

const RENEW_TOKEN_FREQUENT = 3 * 60 * 1000;
const PING_INTERVAL = 60 * 1000;
const STATUS_CHECKER_INTERVAL = 500;

export default class ConnectNats {
  private _nc: NatsConnection | undefined;
  private _js: JetStreamClient | undefined;
  private readonly _natsWSUrls: string[];
  private _token: string;
  private _enableE2EEChat: boolean = false;
  private toastIdConnecting: any = undefined;

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
    subjects: NatsSubjects,
    setErrorState: Dispatch<IErrorPageProps>,
    setRoomConnectionStatusState: Dispatch<roomConnectionStatus>,
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
        i18n.t('notifications.nats-error-title'),
        formatNatsError(e),
      );
      return;
    }

    this._setRoomConnectionStatusState('receiving-data');
    this._isRecorder = isUserRecorder(this.userId);
    this._js = jetstream(this._nc);
    this.messageQueue.js(this._js);

    // now change status to connected
    store.dispatch(updateIsNatsServerConnected(true));
    // start monitoring connection
    this.monitorConnStatus().then();

    // now we'll subscribe to the system only
    // others will be done after received initial data
    this.subscribeToSystemPrivate().then();
    this.subscribeToSystemPublic().then();

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
    // clean audioActivityManager
    audioActivityManager.destroy();

    setTimeout(() => {
      const meta = this._currentRoomInfo?.metadata;
      if (meta?.isBreakoutRoom) {
        // if this was breakout room then we can simply close
        window.close();
      }

      const logout_url = meta?.logoutUrl;
      if (logout_url && logout_url !== '' && isURL(logout_url)) {
        // redirect to log out url
        window.location.href = logout_url;
      }
    }, 3000);
  };

  public sendMessageToSystemWorker = (data: NatsMsgClientToServer) => {
    const subject =
      this._subjects.systemJsWorker + '.' + this._roomId + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(NatsMsgClientToServerSchema, data),
    });
  };

  public sendChatMsg = async (to: string, msg: string) => {
    if (this._enableE2EEChat) {
      try {
        msg = await encryptMessage(msg);
      } catch (e: any) {
        store.dispatch(
          addUserNotification({
            message: 'Encryption error: ' + e.message,
            typeOption: 'error',
          }),
        );
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

  public sendWhiteboardData = (
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

  public sendDataMessage = (
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
      switch (s.type) {
        case 'disconnect':
          // when nats connection drops during that time, it disconnects first
          // then start reconnecting, so we can set false here only
          store.dispatch(updateIsNatsServerConnected(false));
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
          if (this.toastIdConnecting) {
            toast.dismiss(this.toastIdConnecting);
            this.toastIdConnecting = undefined;
          }
          store.dispatch(updateIsNatsServerConnected(true));

          clearInterval(this.statusCheckerInterval);
          this.statusCheckerInterval = undefined;
          this.isRoomReconnecting = false;
          break;
      }
    }
  }

  /**
   * Subscribe to a stream
   * @param streamName
   * @param consumerNameSuffix
   * @param handler
   * @private
   */
  private async _subscribe(
    streamName: string,
    consumerNameSuffix: string,
    handler: (m: JsMsg) => Promise<void>,
  ) {
    if (typeof this._js === 'undefined') {
      return;
    }
    const consumerName = consumerNameSuffix + ':' + this._userId;
    const consumer = await this._js.consumers.get(streamName, consumerName);
    const sub = await consumer.consume();

    for await (const m of sub) {
      try {
        await handler(m);
        m.ack();
      } catch (e) {
        const err = e as Error;
        console.error(err.message);
        m.nak();
      }
    }
  }

  /**
   * All the system private events will be handled here
   * @private
   */
  private async subscribeToSystemPrivate() {
    await this._subscribe(
      this._roomId,
      this._subjects.systemPrivate,
      async (m) => {
        const payload = fromBinary(NatsMsgServerToClientSchema, m.data);
        if (payload.event === NatsMsgServerToClientEvents.SESSION_ENDED) {
          m.ack(); // Ack early before session ends
        }
        await this.handleSystemEvents(payload);
      },
    );
  }

  /**
   * All the system public events will be handled here
   */
  private subscribeToSystemPublic = async () => {
    await this._subscribe(
      this._roomId,
      this._subjects.systemPublic,
      async (m) => {
        const payload = fromBinary(NatsMsgServerToClientSchema, m.data);
        if (payload.event === NatsMsgServerToClientEvents.SESSION_ENDED) {
          m.ack(); // Ack early before session ends
        }
        await this.handleSystemEvents(payload);
      },
    );
  };

  /**
   * All the events related with chat will be handled here,
   * including public and private
   * Encrypted text will also be handled by HandleChat
   */
  private subscribeToChat = async () => {
    await this._subscribe(this._roomId, this._subjects.chat, async (m) => {
      const payload = fromBinary(ChatMessageSchema, m.data);
      await this.handleChat.handleMsg(payload);
    });
  };

  /**
   * All the events related with whiteboard will be handled here
   */
  private subscribeToWhiteboard = async () => {
    await this._subscribe(
      this._roomId,
      this._subjects.whiteboard,
      async (m) => {
        const payload = fromBinary(DataChannelMessageSchema, m.data);
        if (payload.fromUserId !== this._userId) {
          await this.handleWhiteboard.handleWhiteboardMsg(payload);
        }
      },
    );
  };

  /**
   * subscribeToDataChannel to communicate with each other
   * Mostly with client to client
   */
  private subscribeToDataChannel = async () => {
    await this._subscribe(
      this._roomId,
      this._subjects.dataChannel,
      async (m) => {
        const payload = fromBinary(DataChannelMessageSchema, m.data);
        await this.handleDataMsg.handleMessage(payload);
      },
    );
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
    [NatsMsgServerToClientEvents.RES_JOINED_USERS_LIST]: (p) =>
      this.handleJoinedUsersList(p.msg),
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
    [NatsMsgServerToClientEvents.AZURE_COGNITIVE_SERVICE_SPEECH_TOKEN]: (p) =>
      this.handleSystemData.handleAzureToken(p.msg),
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

  private startPingToServer() {
    const ping = () => {
      this.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.PING,
        }),
      );
    };
    this.pingInterval = setInterval(() => {
      ping();
    }, PING_INTERVAL);
    // start instantly
    ping();
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
      const success = await this.createMediaServerConn(data.mediaServerInfo);
      if (!success) {
        // if not success, then we won't do anything else
        return;
      }
    }

    // now request for users' list
    this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_JOINED_USERS_LIST,
      }),
    );

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
   * with an initial data and users list
   */
  private async onAfterUserReady() {
    const donors = getWhiteboardDonors();
    for (let i = 0; i < donors.length; i++) {
      this.sendDataMessage(
        DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA,
        '',
        donors[i].userId,
      );
    }
  }

  private async createMediaServerConn(connInfo: MediaServerConnInfo) {
    if (typeof this._mediaServerConn !== 'undefined') {
      return false;
    }
    const info: LivekitInfo = {
      livekit_host: connInfo.url,
      token: connInfo.token,
    };

    const e2ee =
      this._currentRoomInfo?.metadata?.roomFeatures?.endToEndEncryptionFeatures;

    if (e2ee && e2ee.isEnabled) {
      if (!isE2EESupported()) {
        this.setErrorStatus(
          i18n.t('notifications.e2ee-unsupported-browser-title'),
          i18n.t('notifications.e2ee-unsupported-browser-msg'),
        );
        return false;
      } else {
        let encryptionKey = e2ee.encryptionKey;
        if (e2ee.enabledSelfInsertEncryptionKey) {
          encryptionKey =
            store.getState().roomSettings.selfInsertedE2EESecretKey;
        }

        if (encryptionKey) {
          this._enableE2EEChat = e2ee.includedChatMessages;
          if (e2ee.enabledSelfInsertEncryptionKey) {
            await importSecretKeyFromMaterial(encryptionKey);
          } else {
            await importSecretKeyFromPlainText(encryptionKey);
          }

          info.encryption_key = encryptionKey;
          info.enabledE2EE = true;
        } else {
          this.setErrorStatus(
            i18n.t('notifications.e2ee-invalid-key-title'),
            i18n.t('notifications.e2ee-invalid-key-msg'),
          );
          return false;
        }
      }
    }

    const conn = createLivekitConnection(
      info,
      this._setErrorState,
      this._setRoomConnectionStatusState,
      this._userId,
    );

    this._setCurrentMediaServerConn(conn);
    this._mediaServerConn = conn;
    return true;
  }
}
