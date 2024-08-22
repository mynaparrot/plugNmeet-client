import { toast } from 'react-toastify';

import ConnectNats from './ConnectNats';
import {
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
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_WARNING:
        toast(i18n.t(nt.msg), {
          toastId: 'info-status',
          type: 'warning',
        });
        break;
      case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_ERROR:
        toast(i18n.t(nt.msg), {
          toastId: 'info-status',
          type: 'error',
        });
        this.playNotification();
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

  private playNotification() {
    store.dispatch(updatePlayAudioNotification(true));
  }
}
