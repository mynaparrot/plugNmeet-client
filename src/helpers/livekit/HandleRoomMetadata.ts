import { toast } from 'react-toastify';
import { isEmpty } from 'validator';

import { store } from '../../store';
import i18n from '../i18n';
import { IRoomMetadata } from '../../store/slices/interfaces/session';
import { updateCurrentRoomMetadata } from '../../store/slices/sessionSlice';
import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';

export default class HandleRoomMetadata {
  private metadata: IRoomMetadata | null = null;
  private welcomeMessage: string | undefined = undefined;

  public setRoomMetadata = (metadata: string) => {
    if (!isEmpty(metadata)) {
      try {
        this.metadata = JSON.parse(metadata);
      } catch (e) {
        console.error(e);
        return;
      }

      if (this.metadata) {
        this.setWindowTitle(this.metadata.room_title);
        this.showRecordingNotification();
        this.showRTMPNotification();
        this.publishWelcomeMessage();

        store.dispatch(updateCurrentRoomMetadata(this.metadata));
      }
    }
  };

  private setWindowTitle = (title: string) => {
    document.title = title;
  };

  private showRecordingNotification = () => {
    // we should avoid notification is user is recorder.
    if (store.getState().session.currentUser?.isRecorder) {
      return;
    }

    const isActiveRecording = store.getState().session.isActiveRecording;
    if (!isActiveRecording && this.metadata?.is_recording) {
      toast(i18n.t('room-metadata.session-recording'), {
        type: 'info',
      });
    } else if (isActiveRecording && !this.metadata?.is_recording) {
      toast(i18n.t('room-metadata.session-not-recording'), {
        type: 'info',
      });
    }
  };

  private showRTMPNotification = () => {
    // we should avoid notification is user is recorder.
    if (store.getState().session.currentUser?.isRecorder) {
      return;
    }

    const isActiveRtmpBroadcasting =
      store.getState().session.isActiveRtmpBroadcasting;
    if (!isActiveRtmpBroadcasting && this.metadata?.is_active_rtmp) {
      toast(i18n.t('room-metadata.rtmp-started'), {
        type: 'info',
      });
    } else if (isActiveRtmpBroadcasting && !this.metadata?.is_active_rtmp) {
      toast(i18n.t('room-metadata.rtmp-stopped'), {
        type: 'info',
      });
    }
  };

  private publishWelcomeMessage = () => {
    if (this.welcomeMessage !== undefined) {
      return;
    }

    if (!this.metadata?.welcome_message) {
      this.welcomeMessage = '';
      return;
    }
    if (isEmpty(this.metadata?.welcome_message)) {
      this.welcomeMessage = '';
      return;
    }

    this.welcomeMessage = this.metadata?.welcome_message;
    const body: IChatMsg = {
      type: 'CHAT',
      message_id: '',
      time: '',
      isPrivate: false,
      from: {
        userId: 'system',
        name: 'System',
        sid: 'system',
      },
      msg: this.welcomeMessage ?? '',
    };

    store.dispatch(addChatMessage(body));
  };
}
