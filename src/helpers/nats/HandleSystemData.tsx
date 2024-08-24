import React from 'react';
import { toast } from 'react-toastify';

import ConnectNats from './ConnectNats';
import {
  NatsMsgServerToClient,
  NatsMsgServerToClientEvents,
  NatsSystemNotification,
  NatsSystemNotificationTypes,
} from '../proto/plugnmeet_nats_msg_pb';
import { GenerateAzureTokenRes } from '../proto/plugnmeet_speech_services_pb';
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
import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';

export default class HandleSystemData {
  private _that: ConnectNats;

  constructor(that: ConnectNats) {
    this._that = that;
  }

  /**
   * To handle various notifications
   * @param data
   */
  public handleNotification = (data: string) => {
    const nt = NatsSystemNotification.fromJsonString(data);
    switch (nt.type) {
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO:
        toast(i18n.t(nt.msg), {
          toastId: 'info-status',
          type: 'info',
        });
        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_WARNING:
        toast(i18n.t(nt.msg), {
          toastId: 'info-status',
          type: 'warning',
        });
        if (nt.withSound) {
          this.playNotification();
        }
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_ERROR:
        toast(i18n.t(nt.msg), {
          toastId: 'info-status',
          type: 'error',
        });
        if (nt.withSound) {
          this.playNotification();
        }
        break;
    }
  };

  public handleAzureToken = (data: string) => {
    const res = GenerateAzureTokenRes.fromJsonString(data);
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
      toast(
        i18n.t('speech-services.token-generation-failed', {
          error: res.msg,
        }),
        {
          type: 'error',
        },
      );
    }
  };

  public handlePoll = (payload: NatsMsgServerToClient) => {
    if (payload.event === NatsMsgServerToClientEvents.POLL_CREATED) {
      toast(<NewPollMsg />, {
        toastId: 'info-status',
        type: 'info',
        autoClose: false,
      });
      store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
    } else if (payload.event === NatsMsgServerToClientEvents.POLL_CLOSED) {
      store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
    }
  };

  public handleBreakoutRoomNotifications = (msg: string) => {
    if (msg === '') {
      return;
    }
    store.dispatch(updateReceivedInvitationFor(msg));
    store.dispatch(breakoutRoomApi.util.invalidateTags(['My_Rooms']));
  };

  public handleSysChatMsg = (msg: string) => {
    const now = new Date();

    const body: IChatMsg = {
      type: 'CHAT',
      message_id: `${now.getMilliseconds()}`,
      time: '',
      isPrivate: false,
      from: {
        userId: 'system',
        name: 'System',
        sid: 'system',
      },
      msg: msg,
    };

    store.dispatch(addChatMessage(body));
  };

  private playNotification() {
    store.dispatch(updatePlayAudioNotification(true));
  }
}
