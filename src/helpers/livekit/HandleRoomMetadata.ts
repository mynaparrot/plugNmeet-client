import { toast } from 'react-toastify';
import { isEmpty } from 'validator';
import { isE2EESupported } from 'livekit-client';

import { store } from '../../store';
import i18n from '../i18n';
import { IRoomMetadata } from '../../store/slices/interfaces/session';
import { updateCurrentRoomMetadata } from '../../store/slices/sessionSlice';
import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import { IConnectLivekit } from './types';
import { sleep } from '../utils';
import { handleToAddWhiteboardUploadedOfficeNewFile } from '../../components/whiteboard/helpers/utils';

export default class HandleRoomMetadata {
  private metadata: IRoomMetadata | null = null;
  private that: IConnectLivekit;
  private welcomeMessage: string | undefined = undefined;
  private checkedE2EE = false;
  private checkedPreloadedWhiteboardFile = false;

  constructor(that: IConnectLivekit) {
    this.that = that;
  }

  public setRoomMetadata = async (metadata: string) => {
    if (!isEmpty(metadata)) {
      try {
        this.metadata = JSON.parse(metadata);
      } catch (e) {
        console.error(e);
        return;
      }

      const currentId =
        store.getState().session.currentRoom?.metadata?.metadata_id;
      if (
        currentId &&
        this.metadata?.metadata_id &&
        currentId === this.metadata?.metadata_id
      ) {
        // if both id are same then we don't need to update
        return;
      }

      if (this.metadata) {
        if (!this.checkedE2EE) {
          this.checkedE2EE = true;
          const e2eeFeatures =
            this.metadata.room_features.end_to_end_encryption_features;
          if (
            e2eeFeatures &&
            e2eeFeatures.is_enabled &&
            e2eeFeatures.encryption_key
          ) {
            if (!isE2EESupported()) {
              this.that.setErrorStatus(
                i18n.t('notifications.e2ee-unsupported-browser-title'),
                i18n.t('notifications.e2ee-unsupported-browser-msg'),
              );
            } else {
              if (!this.that.room.isE2EEEnabled) {
                await this.that.e2eeKeyProvider.setKey(
                  e2eeFeatures.encryption_key,
                );
                await this.that.room.setE2EEEnabled(true);
              }
            }
          }
        }

        this.setWindowTitle(this.metadata.room_title);
        this.showRecordingNotification();
        this.showRTMPNotification();
        this.publishWelcomeMessage();

        store.dispatch(updateCurrentRoomMetadata(this.metadata));
        if (!this.checkedPreloadedWhiteboardFile) {
          // we'll check whiteboard preloaded file
          await this.addPreloadWhiteboardFile();
        }
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
    // we should avoid notification is user being recorder.
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

  private addPreloadWhiteboardFile = async () => {
    // without waiting, we won't get current user data
    await sleep(3000);
    if (!store.getState().session.currentUser?.metadata?.is_presenter) {
      this.checkedPreloadedWhiteboardFile = true;
      return;
    }

    const whiteboard = this.metadata?.room_features.whiteboard_features;
    if (!whiteboard?.preload_file || isEmpty(whiteboard?.preload_file)) {
      this.checkedPreloadedWhiteboardFile = true;
      return;
    }

    const ff = whiteboard?.preload_file?.split('/');
    if (!ff) {
      return;
    }
    const fileName = ff[ff.length - 1];

    if (fileName !== whiteboard?.file_name) {
      this.checkedPreloadedWhiteboardFile = true;
      return;
    }

    const whiteboardFiles =
      store.getState().whiteboard.whiteboardUploadedOfficeFiles;
    const exist = whiteboardFiles.find(
      (f) => f.fileId === whiteboard.whiteboard_file_id,
    );
    if (!exist) {
      handleToAddWhiteboardUploadedOfficeNewFile(whiteboard);
    }
    this.checkedPreloadedWhiteboardFile = true;
  };
}
