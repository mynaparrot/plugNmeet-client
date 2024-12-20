import React from 'react';
import { toast } from 'react-toastify';
import { create, fromJsonString } from '@bufbuild/protobuf';
import {
  NatsMsgServerToClient,
  NatsMsgServerToClientEvents,
  NatsSystemNotificationSchema,
  NatsSystemNotificationTypes,
  GenerateAzureTokenResSchema,
  ChatMessageSchema,
} from 'plugnmeet-protocol-js';

import { store } from '../../store';
import {
  updateAzureTokenInfo,
  updatePlayAudioNotification,
} from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';
import { pollsApi } from '../../store/services/pollsApi';
import NewPollMsg from '../../components/extra-pages/newPollMsg';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { breakoutRoomApi } from '../../store/services/breakoutRoomApi';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import { displayInstantNotification } from '../utils';

export default class HandleSystemData {
  constructor() {}

  /**
   * To handle various notifications
   * @param data
   */
  public handleNotification = (data: string) => {
    const nt = fromJsonString(NatsSystemNotificationSchema, data);
    switch (nt.type) {
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO:
        displayInstantNotification(i18n.t(nt.msg), 'info');
        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_WARNING:
        displayInstantNotification(i18n.t(nt.msg), 'warning');
        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_ERROR:
        displayInstantNotification(i18n.t(nt.msg), 'error');
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
      displayInstantNotification(
        i18n.t('speech-services.token-generation-failed', {
          error: res.msg,
        }),
        'error',
      );
    }
  };

  public handlePoll = (payload: NatsMsgServerToClient) => {
    switch (payload.event) {
      case NatsMsgServerToClientEvents.POLL_CREATED:
        displayInstantNotification(i18n.t('polls.new-poll'), 'info');
        toast(<NewPollMsg />, {
          toastId: 'poll-status',
          type: 'info',
          autoClose: false,
        });
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
          displayInstantNotification(
            i18n.t('breakout-room.invitation-msg'),
            'info',
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
  };

  private playNotification() {
    store.dispatch(updatePlayAudioNotification(true));
  }
}
