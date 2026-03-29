import {
  create,
  fromBinary,
  fromJson,
  fromJsonString,
} from '@bufbuild/protobuf';
import {
  ChatMessage,
  ChatMessageSchema,
  DataChannelMessageSchema,
  DataMsgBodyType,
  MediaServerConnInfoSchema,
  NatsInitialData,
  NatsInitialDataSchema,
  NatsKvUserInfoSchema,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
  NatsMsgServerToClient,
  NatsMsgServerToClientEvents,
  NatsMsgServerToClientSchema,
  PrivateDataDeliverySchema,
} from 'plugnmeet-protocol-js';

import ConnectNats, { PrivateDataDeliveryType } from './ConnectNats';
import HandleRoomData from './HandleRoomData';
import HandleParticipants from './HandleParticipants';
import HandleDataMessage from './HandleDataMessage';
import HandleWhiteboard from './HandleWhiteboard';
import HandleChat from './HandleChat';
import HandleSystemData from './HandleSystemData';

import { store } from '../../store';
import { setAllUserNotifications } from '../../store/slices/roomSettingsSlice';
import { DB_STORE_NAMES, idbGet, idbGetAll, initIDB } from '../libs/idb';
import { UserNotification } from '../../store/slices/interfaces/roomSettings';
import {
  SELECTED_SUBTITLE_LANG_KEY,
  TextWithInfo,
} from '../../store/slices/interfaces/speechServices';
import { addAllChatMessages } from '../../store/slices/chatMessagesSlice';
import { setSpeechToTextLastFinalTexts } from '../../store/slices/speechServicesSlice';
import { getChatDonors, getWhiteboardDonors } from '../utils';
import i18n from '../i18n';

export default class SubscriptionHandler {
  private readonly connectNats: ConnectNats;

  private readonly _handleRoomData: HandleRoomData;
  private readonly _handleSystemData: HandleSystemData;
  private readonly _handleParticipants: HandleParticipants;
  private readonly _handleChat: HandleChat;
  private readonly _handleDataMsg: HandleDataMessage;
  private readonly _handleWhiteboard: HandleWhiteboard;

  constructor(connectNats: ConnectNats) {
    this.connectNats = connectNats;

    this._handleRoomData = new HandleRoomData(
      this.connectNats.roomId,
      this.connectNats.userId,
    );
    this._handleSystemData = new HandleSystemData(this.connectNats.userId);
    this._handleParticipants = new HandleParticipants(this.connectNats);
    this._handleChat = new HandleChat(this.connectNats);
    this._handleDataMsg = new HandleDataMessage(this.connectNats);
    this._handleWhiteboard = new HandleWhiteboard();
  }

  get handleParticipants(): HandleParticipants {
    return this._handleParticipants;
  }
  get handleChat(): HandleChat {
    return this._handleChat;
  }

  public initializeSubscriptions = () => {
    // now we'll subscribe to the room events stream
    this.subscribeToRoomEvents().then();
    // we'll still need this for any pub/sub based messages
    this.subscribeToSystemPublicPubSub().then();
  };

  /**
   * Subscribes to the single user consumer on the main room stream.
   * This one subscription will handle all JetStream-based messages for the user,
   * @private
   */
  private async subscribeToRoomEvents() {
    if (typeof this.connectNats.js === 'undefined') {
      return;
    }
    const consumerName = `${this.connectNats.roomId}_${this.connectNats.userId}`;
    const consumer = await this.connectNats.js.consumers.get(
      this.connectNats.roomStreamName,
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
    if (!this.connectNats.nc) {
      return;
    }

    const subject = `${this.connectNats.subjects.systemPublic}.${this.connectNats.roomId}`;
    const sub = this.connectNats.nc.subscribe(subject);

    for await (const m of sub) {
      const payload = fromBinary(NatsMsgServerToClientSchema, m.data);
      await this.handleSystemEvents(payload);
    }
  }

  private async handlePrivateDataDelivery(p: NatsMsgServerToClient) {
    const header = fromJsonString(PrivateDataDeliverySchema, p.msg);
    switch (header.type as PrivateDataDeliveryType) {
      case 'CHAT':
        await this.processToHandleChatMsg(p.binMsg);
        break;
      case 'DATA_MSG':
        await this.processToHandleDataMsg(p.binMsg);
        break;
    }
  }

  private async processToHandleChatMsg(data: Uint8Array<ArrayBufferLike>) {
    let dataToParse = data;
    if (this.connectNats.enableE2EEChat) {
      const data = await this.connectNats.decryptData(dataToParse);
      if (typeof data === 'undefined') {
        return;
      }
      dataToParse = data;
    }
    const payload = fromBinary(ChatMessageSchema, dataToParse);
    await this._handleChat.handleMsg(payload);
  }

  /**
   * All the events related with chat will be handled here,
   * including public and private
   */
  private async subscribeToChat() {
    if (!this.connectNats.nc) {
      return;
    }
    const subject = `${this.connectNats.subjects.chat}.${this.connectNats.roomId}`;
    const sub = this.connectNats.nc.subscribe(subject);

    const donors = getChatDonors();
    for (let i = 0; i < donors.length; i++) {
      this.connectNats
        .sendDataMessage(
          DataMsgBodyType.REQ_PUBLIC_CHAT_DATA,
          '',
          donors[i].userId,
        )
        .then();
    }

    for await (const m of sub) {
      await this.processToHandleChatMsg(m.data);
    }
  }

  /**
   * Subscribes to the room's whiteboard channel using NATS Core Pub/Sub for low latency.
   */
  private async subscribeToWhiteboard() {
    if (!this.connectNats.nc) {
      return;
    }
    const subject = `${this.connectNats.subjects.whiteboard}.${this.connectNats.roomId}`;
    const sub = this.connectNats.nc.subscribe(subject);

    const donors = getWhiteboardDonors();
    for (let i = 0; i < donors.length; i++) {
      this.connectNats
        .sendDataMessage(
          DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA,
          '',
          donors[i].userId,
        )
        .then();
    }

    for await (const m of sub) {
      let dataToParse = m.data;
      if (this.connectNats.enableE2EEWhiteboard) {
        const data = await this.connectNats.decryptData(dataToParse);
        if (typeof data === 'undefined') {
          continue; // Skip if decryption fails
        }
        dataToParse = data;
      }
      const payload = fromBinary(DataChannelMessageSchema, dataToParse);
      // Still need to check if the message is from the local user to avoid echo.
      if (payload.fromUserId !== this.connectNats.userId) {
        await this._handleWhiteboard.handleWhiteboardMsg(payload);
      }
    }
  }

  private async processToHandleDataMsg(data: Uint8Array<ArrayBufferLike>) {
    let dataToParse = data;
    if (this.connectNats.enableE2EE) {
      const data = await this.connectNats.decryptData(dataToParse);
      if (typeof data === 'undefined') {
        return;
      }
      dataToParse = data;
    }
    const payload = fromBinary(DataChannelMessageSchema, dataToParse);
    // Don't process our own messages or private messages for others.
    if (
      payload.fromUserId === this.connectNats.userId ||
      (payload.toUserId && payload.toUserId !== this.connectNats.userId)
    ) {
      return;
    }

    // All other messages are for us
    await this._handleDataMsg.handleMessage(payload);
  }

  /**
   * Subscribes to the room's data channel using NATS Core Pub/Sub for low latency.
   * Mostly with client to client
   */
  private async subscribeToDataChannel() {
    if (!this.connectNats.nc) {
      return;
    }

    const subject = `${this.connectNats.subjects.dataChannel}.${this.connectNats.roomId}`;
    const sub = this.connectNats.nc.subscribe(subject);

    for await (const m of sub) {
      await this.processToHandleDataMsg(m.data);
    }
  }

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
      this.connectNats.setRoomConnectionStatusState('ready');
    },
    [NatsMsgServerToClientEvents.RES_MEDIA_SERVER_DATA]: async (p) => {
      await this.handleMediaServerData(p.msg);
    },
    [NatsMsgServerToClientEvents.RES_JOINED_USERS_LIST]: (p) =>
      this.handleJoinedUsersList(p.msg),
    [NatsMsgServerToClientEvents.RESP_ONLINE_USERS_LIST]: (p) =>
      this._handleParticipants.reconcileParticipants(p.msg),
    [NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE]: (p) =>
      this._handleRoomData.updateRoomMetadata(p.msg),
    [NatsMsgServerToClientEvents.RESP_RENEW_PNM_TOKEN]: (p) => {
      this.connectNats.token = p.msg.toString();
    },
    [NatsMsgServerToClientEvents.SYSTEM_NOTIFICATION]: (p) => {
      !this.connectNats.isRecorder &&
        this._handleSystemData.handleNotification(p.msg);
    },
    [NatsMsgServerToClientEvents.USER_JOINED]: (p) =>
      this._handleParticipants.addRemoteParticipant(p.msg),
    [NatsMsgServerToClientEvents.USER_DISCONNECTED]: (p) =>
      this._handleParticipants.handleParticipantDisconnected(p.msg),
    [NatsMsgServerToClientEvents.USER_OFFLINE]: (p) =>
      this._handleParticipants.handleParticipantOffline(p.msg),
    [NatsMsgServerToClientEvents.USER_METADATA_UPDATE]: (p) =>
      this._handleParticipants.handleParticipantMetadataUpdate(p.msg),
    [NatsMsgServerToClientEvents.SESSION_ENDED]: (p) =>
      this.connectNats.endSession(p.msg),
    [NatsMsgServerToClientEvents.POLL_CREATED]: (p) =>
      this._handleSystemData.handlePoll(p),
    [NatsMsgServerToClientEvents.POLL_CLOSED]: (p) =>
      this._handleSystemData.handlePoll(p),
    [NatsMsgServerToClientEvents.JOIN_BREAKOUT_ROOM]: (p) =>
      this._handleSystemData.handleBreakoutRoom(p),
    [NatsMsgServerToClientEvents.BREAKOUT_ROOM_ENDED]: (p) =>
      this._handleSystemData.handleBreakoutRoom(p),
    [NatsMsgServerToClientEvents.SYSTEM_CHAT_MSG]: (p) =>
      this._handleSystemData.handleSysChatMsg(p.msg),
    [NatsMsgServerToClientEvents.TRANSCRIPTION_OUTPUT_TEXT]: (p) =>
      this._handleDataMsg.handleSpeechSubtitleText(p.msg),
    [NatsMsgServerToClientEvents.RESP_INSIGHTS_AI_TEXT_CHAT]: (p) =>
      this._handleSystemData.handleInsightsAITextData(p.msg),
    [NatsMsgServerToClientEvents.DELIVERY_PRIVATE_DATA]: (p) =>
      this.handlePrivateDataDelivery(p),
    [NatsMsgServerToClientEvents.PONG]: () => this.connectNats.handlePong(),
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

  private async handleInitialData(msg: string) {
    // 1. We'll try to decode the message.
    let data: NatsInitialData;
    try {
      data = fromJsonString(NatsInitialDataSchema, msg, {
        ignoreUnknownFields: true,
      });
    } catch (e: any) {
      console.error(e);
      this.connectNats.setErrorStatus(
        i18n.t('notifications.decode-error-title'),
        i18n.t('notifications.decode-error-body'),
      );
      return;
    }

    // 2. We'll check if the data is valid.
    if (!data.room || !data.localUser) {
      this.connectNats.setErrorStatus(
        i18n.t('notifications.decode-error-title'),
        i18n.t('notifications.invalid-missing-data'),
      );
      return;
    }

    // 3. We'll add the room info.
    this.connectNats.currentRoomInfo = await this._handleRoomData.setRoomInfo(
      data.room,
    );

    // 4. We'll initialize the indexedDB for this session.
    initIDB(this.connectNats.currentRoomInfo.sid, this.connectNats.userId);

    // 5. We'll add the local user.
    this.connectNats.isAdmin = data.localUser.isAdmin;
    const localUser = await this._handleParticipants.addLocalParticipantInfo(
      data.localUser,
    );
    this.connectNats.userName = localUser.name;

    // 6. We'll initialize the media server class.
    await this.connectNats.initializeMediaServer(
      this.connectNats.currentRoomInfo.metadata?.roomFeatures
        ?.endToEndEncryptionFeatures,
      data.room.roomSid,
    );
  }

  private async handleJoinedUsersList(msg: string) {
    try {
      const onlineUsers: string[] = JSON.parse(msg);
      for (let i = 0; i < onlineUsers.length; i++) {
        const user = fromJson(NatsKvUserInfoSchema, onlineUsers[i], {
          ignoreUnknownFields: true,
        });
        await this._handleParticipants.addRemoteParticipant(user);
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
    this.connectNats.sendMessageToSystemWorker(
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
            currentUserId: this.connectNats.userId,
          }),
        );
      }
      if (notifications.length) {
        store.dispatch(setAllUserNotifications(notifications));
      }
      // Restore speech-to-text data if the feature is enabled.
      const transcriptionFeatures =
        this.connectNats.currentRoomInfo?.metadata?.roomFeatures
          ?.insightsFeatures?.transcriptionFeatures;
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

    if (this.connectNats.isRecorder) {
      this._handleParticipants.recorderJoined();
    }

    this.connectNats.startUsersSync();
  }

  /**
   * handleMediaServerData will decode data and connect with media server
   * @param msg
   */
  private async handleMediaServerData(msg: string) {
    try {
      const serverInfo = fromJsonString(MediaServerConnInfoSchema, msg);
      if (this.connectNats.mediaServerConn) {
        await this.connectNats.mediaServerConn.initializeConnection(serverInfo);
      }
    } catch (e: any) {
      console.error(e);
      this.connectNats.setErrorStatus(
        i18n.t('notifications.decode-error-title'),
        i18n.t('notifications.decode-error-body'),
      );
      return;
    }
  }
}
