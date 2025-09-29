import { create, fromJsonString } from '@bufbuild/protobuf';
import {
  ChatMessageSchema,
  GenerateAzureTokenResSchema,
  NatsMsgServerToClient,
  NatsMsgServerToClientEvents,
  NatsSystemNotificationSchema,
  NatsSystemNotificationTypes,
} from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  addUserNotification,
  updateAzureTokenInfo,
  updatePlayAudioNotification,
} from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';
import { pollsApi } from '../../store/services/pollsApi';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { breakoutRoomApi } from '../../store/services/breakoutRoomApi';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';

export default class HandleSystemData {
  /**
   * To handle various notifications
   * @param data
   */
  public handleNotification = (data: string) => {
    const nt = fromJsonString(NatsSystemNotificationSchema, data);
    switch (nt.type) {
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO:
        store.dispatch(
          addUserNotification({
            message: i18n.t(nt.msg),
            typeOption: 'info',
            newInstance: true,
          }),
        );

        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_WARNING:
        store.dispatch(
          addUserNotification({
            message: i18n.t(nt.msg),
            typeOption: 'warning',
            newInstance: true,
          }),
        );
        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_ERROR:
        store.dispatch(
          addUserNotification({
            message: i18n.t(nt.msg),
            typeOption: 'error',
            newInstance: true,
          }),
        );
        if (nt.withSound) {
          this.playNotification();
        }
        break;
    }
  };

  public handleAzureToken = (data: string) => {
    const res = fromJsonString(GenerateAzureTokenResSchema, data);
    if (res.status && res.token && res.keyId && res.serviceRegion) {
      store.dispatch(
        updateAzureTokenInfo({
          token: res.token,
          keyId: res.keyId,
          serviceRegion: res.serviceRegion,
          renew: res.renew,
        }),
      );
    } else {
      store.dispatch(
        addUserNotification({
          message: i18n.t('speech-services.token-generation-failed', {
            error: res.msg,
          }),
          typeOption: 'error',
        }),
      );
    }
  };

  public handlePoll = (payload: NatsMsgServerToClient) => {
    switch (payload.event) {
      case NatsMsgServerToClientEvents.POLL_CREATED:
        store.dispatch(
          addUserNotification({
            message: i18n.t('polls.new-poll'),
            typeOption: 'info',
            notificationCat: 'new-poll-created',
            autoClose: false,
          }),
        );
        store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
        break;
      case NatsMsgServerToClientEvents.POLL_CLOSED:
        store.dispatch(
          pollsApi.util.invalidateTags([
            'List',
            'PollsStats',
            {
              type: 'Count',
              id: payload.msg,
            },
            {
              type: 'Selected',
              id: payload.msg,
            },
            {
              type: 'PollResult',
              id: payload.msg,
            },
            {
              type: 'PollDetails',
              id: payload.msg,
            },
          ]),
        );
        break;
    }
  };

  public handleBreakoutRoom = (payload: NatsMsgServerToClient) => {
    switch (payload.event) {
      case NatsMsgServerToClientEvents.JOIN_BREAKOUT_ROOM:
        if (payload.msg !== '') {
          store.dispatch(
            addUserNotification({
              message: i18n.t('breakout-room.invitation-msg'),
              typeOption: 'info',
              notificationCat: 'breakout-room-invitation',
              data: payload.msg,
              disableToastNotification: true,
            }),
          );
          store.dispatch(updateReceivedInvitationFor(payload.msg));
          store.dispatch(breakoutRoomApi.util.invalidateTags(['My_Rooms']));
        }
        break;
      case NatsMsgServerToClientEvents.BREAKOUT_ROOM_ENDED:
        store.dispatch(
          breakoutRoomApi.util.invalidateTags(['List', 'My_Rooms']),
        );
        break;
    }
  };

  public handleSysChatMsg = (msg: string) => {
    const now = Date.now();
    const body = create(ChatMessageSchema, {
      id: `${now}`,
      sentAt: `${now}`,
      isPrivate: false,
      fromName: 'system',
      fromUserId: 'system',
      message: msg,
      fromAdmin: true, // system message always from admin
    });

    store.dispatch(addChatMessage(body));
    store.dispatch(
      addUserNotification({
        message: i18n.t('notifications.new-system-message-in-chat'),
        typeOption: 'info',
        newInstance: true,
      }),
    );
  };

  private playNotification() {
    store.dispatch(updatePlayAudioNotification(true));
  }
}
