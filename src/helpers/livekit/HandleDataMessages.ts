import { DataPacket_Kind, Participant } from 'livekit-client';
import { toast } from 'react-toastify';
import i18n from '../i18n';

import { IConnectLivekit } from './types';
import { store } from '../../store';
import { updatePlayAudioNotification } from '../../store/slices/roomSettingsSlice';
import {
  DataMessage,
  DataMsgBody,
  DataMsgBodyType,
  DataMsgType,
} from '../proto/plugnmeet_datamessage_pb';

export default class HandleDataMessages {
  private that: IConnectLivekit;
  private requestedParticipant: Participant | undefined;

  constructor(that: IConnectLivekit) {
    this.that = that;
  }

  public dataReceived = (
    payload: Uint8Array,
    participant?: Participant,
    kind?: DataPacket_Kind,
  ) => {
    this.requestedParticipant = participant;
    let data: DataMessage;
    try {
      data = DataMessage.fromBinary(new Uint8Array(payload));
    } catch (error) {
      console.error(error);
      return;
    }

    if (kind === DataPacket_Kind.RELIABLE) {
      if (data.type === DataMsgType.SYSTEM) {
        if (!store.getState().session.currentUser?.isRecorder) {
          if (data.body) {
            this.handleSystemTypeData(data.body);
          }
        }
      }
    }
  };

  private handleSystemTypeData = (body: DataMsgBody) => {
    switch (body.type) {
      case DataMsgBodyType.RAISE_HAND:
      case DataMsgBodyType.INFO:
        toast(i18n.t(body.msg).toString(), {
          type: 'info',
        });
        this.playNotification(body.type);
        break;

      case DataMsgBodyType.ALERT:
        toast(i18n.t(body.msg).toString(), {
          type: 'error',
        });
        this.playNotification(body.type);
        break;
    }
  };

  private playNotification = (type: DataMsgBodyType) => {
    if (type === DataMsgBodyType.RAISE_HAND || type === DataMsgBodyType.ALERT) {
      store.dispatch(updatePlayAudioNotification(true));
    }
  };
}
