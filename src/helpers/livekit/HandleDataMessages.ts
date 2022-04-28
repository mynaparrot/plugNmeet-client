import { DataPacket_Kind, Participant } from 'livekit-client';
import { toast } from 'react-toastify';
import i18n from '../i18n';

import { IConnectLivekit } from './ConnectLivekit';
import {
  IDataMessage,
  ISystemMsg,
  SystemMsgType,
} from '../../store/slices/interfaces/dataMessages';
import { store } from '../../store';
import { updatePlayAudioNotification } from '../../store/slices/roomSettingsSlice';

const textDecoder = new TextDecoder();

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
    const decodedText = textDecoder.decode(payload);
    if (!decodedText) {
      return;
    }

    let data: IDataMessage;
    try {
      data = JSON.parse(decodedText);
    } catch (error) {
      return;
    }

    if (kind === DataPacket_Kind.RELIABLE) {
      if (data.type === 'SYSTEM') {
        if (!store.getState().session.currentUser?.isRecorder) {
          this.handleSystemTypeData(data.body as ISystemMsg);
        }
      }
    }
  };

  private handleSystemTypeData = (body: ISystemMsg) => {
    switch (body.type) {
      case SystemMsgType.RAISE_HAND:
      case SystemMsgType.INFO:
        toast(i18n.t(body.msg), {
          type: 'info',
        });
        this.playNotification(body.type);
        break;

      case SystemMsgType.ALERT:
        toast(i18n.t(body.msg), {
          type: 'error',
        });
        this.playNotification(body.type);
        break;
    }
  };

  private playNotification = (type: SystemMsgType) => {
    if (type === SystemMsgType.RAISE_HAND || type === SystemMsgType.ALERT) {
      store.dispatch(updatePlayAudioNotification(true));
    }
  };
}
