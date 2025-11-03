import { DataChannelMessage, DataMsgBodyType } from 'plugnmeet-protocol-js';

import ConnectNats from './ConnectNats';
import { store } from '../../store';
import {
  addWhiteboardDataSentFromDonor,
  updateRequestedWhiteboardData,
} from '../../store/slices/whiteboard';
import { pollsApi } from '../../store/services/pollsApi';
import { SpeechTextBroadcastFormat } from '../../store/slices/interfaces/speechServices';
import { addSpeechSubtitleText } from '../../store/slices/speechServicesSlice';
import { updateParticipant } from '../../store/slices/participantSlice';
import {
  addExternalMediaPlayerAction,
  externalMediaPlayerSeekTo,
} from '../../store/slices/externalMediaPlayer';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import i18n from '../i18n';
import { ConnectionQuality } from 'livekit-client';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { WhiteboardDataAsDonorData } from '../../store/slices/interfaces/whiteboard';

export default class HandleDataMessage {
  private connectNats: ConnectNats;

  constructor(connectNats: ConnectNats) {
    this.connectNats = connectNats;
  }

  public handleMessage = async (payload: DataChannelMessage) => {
    switch (payload.type) {
      case DataMsgBodyType.REQ_FULL_WHITEBOARD_DATA:
        if (payload.toUserId === this.connectNats.userId) {
          // only if was sent for me
          this.handleSendInitWhiteboard(payload);
        }
        break;
      case DataMsgBodyType.RES_FULL_WHITEBOARD_DATA:
        if (payload.toUserId === this.connectNats.userId) {
          // only if was sent for me
          this.handleWhiteboardDataSentFromDonor(payload.message);
        }
        break;
      case DataMsgBodyType.USER_VISIBILITY_CHANGE:
        if (payload.fromUserId === this.connectNats.userId) {
          return;
        }
        this.handleUserVisibility(payload);
        break;
      case DataMsgBodyType.INFO:
        if (
          payload.fromUserId === this.connectNats.userId ||
          this.connectNats.isRecorder
        ) {
          return;
        }
        store.dispatch(
          addUserNotification({
            message: i18n.t(payload.message),
            typeOption: 'info',
          }),
        );
        break;
      case DataMsgBodyType.ALERT:
        if (
          payload.fromUserId === this.connectNats.userId ||
          this.connectNats.isRecorder
        ) {
          return;
        }
        store.dispatch(
          addUserNotification({
            message: i18n.t(payload.message),
            typeOption: 'warning',
          }),
        );
        break;
      case DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS:
        if (payload.fromUserId === this.connectNats.userId) {
          return;
        }
        this.handleExternalMediaPlayerEvents(payload.message);
        break;
      case DataMsgBodyType.NEW_POLL_RESPONSE:
        if (payload.fromUserId === this.connectNats.userId) {
          return;
        }
        store.dispatch(
          pollsApi.util.invalidateTags([
            {
              type: 'Count',
              id: payload.message,
            },
            {
              type: 'Selected',
              id: payload.message,
            },
            {
              type: 'PollDetails',
              id: payload.message,
            },
          ]),
        );
        break;
      case DataMsgBodyType.SPEECH_SUBTITLE_TEXT:
        this.handleSpeechSubtitleText(payload.message);
        break;
      case DataMsgBodyType.USER_CONNECTION_QUALITY_CHANGE:
        store.dispatch(
          updateParticipant({
            id: payload.fromUserId,
            changes: {
              connectionQuality: payload.message as ConnectionQuality,
            },
          }),
        );
        break;
      case DataMsgBodyType.PUSH_JOIN_BREAKOUT_ROOM:
        if (payload.toUserId === this.connectNats.userId) {
          store.dispatch(updateReceivedInvitationFor(payload.message));
        }
        break;
    }
  };

  private handleSendInitWhiteboard(payload: DataChannelMessage) {
    if (store.getState().whiteboard.requestedWhiteboardData.requested) {
      // already have one request
      return;
    }
    // we'll update the reducer-only
    // component will take care for sending data
    store.dispatch(
      updateRequestedWhiteboardData({
        requested: true,
        sendTo: payload.fromUserId,
      }),
    );
  }

  private handleUserVisibility(payload: DataChannelMessage) {
    if (!this.connectNats.isAdmin) {
      return;
    }
    store.dispatch(
      updateParticipant({
        id: payload.fromUserId,
        changes: {
          visibility: payload.message,
        },
      }),
    );
  }

  private handleExternalMediaPlayerEvents(msg: string) {
    if (msg === '') {
      return;
    }
    const data = JSON.parse(msg);
    store.dispatch(addExternalMediaPlayerAction(data.action));
    if (typeof data.seekTo !== 'undefined') {
      store.dispatch(externalMediaPlayerSeekTo(data.seekTo));
    }
  }

  private handleSpeechSubtitleText(message: string) {
    if (message === '') {
      return;
    }
    const data: SpeechTextBroadcastFormat = JSON.parse(message);
    const lang = store.getState().speechServices.selectedSubtitleLang;

    if (lang !== '' && typeof data.result[lang] !== 'undefined') {
      const d = new Date();
      store.dispatch(
        addSpeechSubtitleText({
          type: data.type,
          result: {
            text: data.result[lang],
            from: data.from,
            time: d.toLocaleTimeString(),
            id: d.getUTCMilliseconds().toString(),
          },
        }),
      );
    }
  }

  private handleWhiteboardDataSentFromDonor(msg: string) {
    try {
      const data: WhiteboardDataAsDonorData = JSON.parse(msg);
      store.dispatch(addWhiteboardDataSentFromDonor(data));
    } catch (e) {
      console.error(e);
    }
  }
}
