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
import { jetstream, JetStreamClient, JsMsg } from '@nats-io/jetstream';
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
  getWhiteboardDonors,
  isUserRecorder,
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

const RENEW_TOKEN_FREQUENT = 3 * 60 * 1000;
const PING_INTERVAL = 60 * 1000;
const STATUS_CHECKER_INTERVAL = 500;

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
    this.messageQueue.setIsConnected(false);

    this._setErrorState({
      title: i18n.t('notifications.room-disconnected-title'),
      text: i18n.t(msg),
    });
    this._setRoomConnectionStatusState('disconnected');
    // clean AudioManager
    destroyAudioManager();
    // clean room-specific IndexedDB storage
    await deleteRoomDB();

    setTimeout(() => {
      const meta = this._currentRoomInfo?.metadata;
      if (meta?.isBreakoutRoom) {
        // if this was breakout room then we can simply close
        window.close();
      }

      if (meta?.logoutUrl) {
        try {
          // validate URL
          const logout_url = new URL(meta.logoutUrl);
          // redirect to log out url
          window.location.href = logout_url.href;
        } catch (e) {
          console.error(e);
        }
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
          // when nats connection drops during that time, it disconnects first
          // then start reconnecting, so we can set false here only
          store.dispatch(updateIsNatsServerConnected(false));
          this.messageQueue.setIsConnected(false);
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
          this.messageQueue.setIsConnected(true);

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
  private async subscribeToSystemPublic() {
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
  }

  public sendMessageToSystemWorker = (data: NatsMsgClientToServer) => {
    const subject =
      this._subjects.systemJsWorker + '.' + this._roomId + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload: toBinary(NatsMsgClientToServerSchema, data),
    });
  };

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

  /**
   * All the events related with chat will be handled here,
   * including public and private
   */
  private async subscribeToChat() {
    await this._subscribe(this._roomId, this._subjects.chat, async (m) => {
      let dataToParse = m.data;
      if (this._enableE2EEChat) {
        const data = await this.decryptData(dataToParse);
        if (typeof data === 'undefined') {
          return;
        }
        dataToParse = data;
      }
      const payload = fromBinary(ChatMessageSchema, dataToParse);
      await this.handleChat.handleMsg(payload);
    });
  }

  public sendChatMsg = async (to: string, msg: string) => {
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

    let payload: Uint8Array = toBinary(ChatMessageSchema, chatMessage);

    if (this._enableE2EEChat) {
      const data = await this.encryptData(payload);
      if (typeof data === 'undefined') {
        return;
      }
      payload = data;
    }

    const subject =
      this._roomId + ':' + this._subjects.chat + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload,
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

  /**
   * All the events related with whiteboard will be handled here
   */
  private async subscribeToWhiteboard() {
    await this._subscribe(
      this._roomId,
      this._subjects.whiteboard,
      async (m) => {
        let dataToParse = m.data;
        if (this._enableE2EEWhiteboard) {
          const data = await this.decryptData(dataToParse);
          if (typeof data === 'undefined') {
            return;
          }
          dataToParse = data;
        }
        const payload = fromBinary(DataChannelMessageSchema, dataToParse);
        if (payload.fromUserId !== this._userId) {
          await this.handleWhiteboard.handleWhiteboardMsg(payload);
        }
      },
    );
  }

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

    let payload: Uint8Array = toBinary(DataChannelMessageSchema, data);
    if (this._enableE2EEWhiteboard) {
      const data = await this.encryptData(payload);
      if (typeof data === 'undefined') {
        return;
      }
      payload = data;
    }

    const subject =
      this._roomId + ':' + this._subjects.whiteboard + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload,
    });
  };

  /**
   * subscribeToDataChannel to communicate with each other
   * Mostly with client to client
   */
  private async subscribeToDataChannel() {
    await this._subscribe(
      this._roomId,
      this._subjects.dataChannel,
      async (m) => {
        let dataToParse = m.data;
        if (this._enableE2EE) {
          const data = await this.decryptData(dataToParse);
          if (typeof data === 'undefined') {
            return;
          }
          dataToParse = data;
        }
        const payload = fromBinary(DataChannelMessageSchema, dataToParse);
        await this.handleDataMsg.handleMessage(payload);
      },
    );
  }

  /**
   * sendDataMessage method mostly use to communicate between clients
   */
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

    let payload: Uint8Array = toBinary(DataChannelMessageSchema, data);
    if (this._enableE2EE) {
      const data = await this.encryptData(payload);
      if (typeof data === 'undefined') {
        return;
      }
      payload = data;
    }

    const subject =
      this._roomId + ':' + this._subjects.dataChannel + '.' + this._userId;
    this.messageQueue.addToQueue({
      subject,
      payload,
    });
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
    // 1. We'll try to decode the message.
    let data: NatsInitialData;
    try {
      data = fromJsonString(NatsInitialDataSchema, msg);
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
    );
  }

  /**
   * Finalizes the application connection.
   * This method should be called when the application is ready
   * to establish the full connection, typically after receiving approval to join the room.
   * Calling this method prematurely may result in the media server token expiring before it is used.
   */
  public finalizeAppConn = () => {
    // 1. Request for users' list to prepare everything
    this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_JOINED_USERS_LIST,
      }),
    );

    // 2. Request for media server connection data
    this.sendMessageToSystemWorker(
      create(NatsMsgClientToServerSchema, {
        event: NatsMsgClientToServerEvents.REQ_MEDIA_SERVER_DATA,
      }),
    );
  };

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
   * This method is called after the current user has received the initial data
   * and the list of online users. It performs final setup tasks to make the
   * user fully operational in the room.
   */
  private async onAfterUserReady() {
    // 1. Restore user data from IndexedDB to maintain state across sessions.
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
      const speechToTextTranslationFeatures =
        this._currentRoomInfo?.metadata?.roomFeatures
          ?.speechToTextTranslationFeatures;
      if (
        speechToTextTranslationFeatures?.isEnabled &&
        speechToTextFinalTexts &&
        speechToTextFinalTexts.length
      ) {
        let subtitleLang = lastSubtitleLang;
        if (!lastSubtitleLang) {
          subtitleLang = speechToTextTranslationFeatures.defaultSubtitleLang;
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

    // 2. Subscribe to real-time data channels.
    // These subscriptions are set up after initial data is loaded to ensure
    // that all necessary user and room information is available.
    // For example, E2EE requires a key that is part of the initial data.
    Promise.all([
      this.subscribeToChat(),
      this.subscribeToWhiteboard(),
      this.subscribeToDataChannel(),
    ]).then(async () => {
      // 3. Now that we are fully connected and subscribed,
      // request the complete whiteboard data from other users.
      const donors = getWhiteboardDonors();
      for (let i = 0; i < donors.length; i++) {
        await this.sendDataMessage(
          DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA,
          '',
          donors[i].userId,
        );
      }
    });
  }

  private async initializeMediaServer(
    e2ee: EndToEndEncryptionFeatures | undefined,
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
        await importSecretKeyFromPlainText(encryptionKey);

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
