import { toast } from 'react-toastify';

import {
  ICurrentRoom,
  IRoomMetadata,
} from '../../store/slices/interfaces/session';
import { NatsKvRoomInfo } from '../proto/plugnmeet_nats_msg_pb';
import { store } from '../../store';
import {
  addCurrentRoom,
  updateCurrentRoomMetadata,
} from '../../store/slices/sessionSlice';
import i18n from '../i18n';
import { IChatMsg } from '../../store/slices/interfaces/dataMessages';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import { sleep } from '../utils';
import { handleToAddWhiteboardUploadedOfficeNewFile } from '../../components/whiteboard/helpers/utils';
import ConnectNats from './ConnectNats';

export default class HandleRoomData {
  private _that: ConnectNats;
  private _room: ICurrentRoom;
  private welcomeMessage: string | undefined = undefined;
  private checkedPreloadedWhiteboardFile = false;

  constructor(private that: ConnectNats) {
    this._that = that;
    this._room = {
      room_id: '',
      sid: '',
      metadata: undefined,
    };
  }

  get roomInfo(): ICurrentRoom {
    return this._room;
  }

  public setRoomInfo = async (msg: string) => {
    const info = NatsKvRoomInfo.fromJsonString(msg);
    this._room = {
      room_id: info.roomId,
      sid: info.roomSid,
    };
    store.dispatch(addCurrentRoom(this._room));
    await this.updateRoomMetadata(info.metadata);
  };

  public updateRoomMetadata = async (data: string) => {
    const metadata: IRoomMetadata = JSON.parse(data);

    if (
      typeof this._room.metadata === 'undefined' ||
      this._room.metadata.metadata_id !== metadata.metadata_id
    ) {
      this._room.metadata = metadata;
      await this.updateMetadata();
    }
  };

  private async updateMetadata() {
    if (typeof this._room.metadata === 'undefined') {
      return;
    }

    this.setWindowTitle(this._room.metadata.room_title);
    this.showRecordingNotification();
    this.showRTMPNotification();
    this.publishWelcomeMessage();

    store.dispatch(updateCurrentRoomMetadata(this._room.metadata));
    if (!this.checkedPreloadedWhiteboardFile) {
      // we'll check whiteboard preloaded file
      await this.addPreloadWhiteboardFile();
    }
  }

  private setWindowTitle = (title: string) => {
    document.title = title;
  };

  private showRecordingNotification = () => {
    // we should avoid notification is user is recorder.
    if (store.getState().session.currentUser?.isRecorder) {
      return;
    }

    const isActiveRecording = store.getState().session.isActiveRecording;
    if (!isActiveRecording && this._room.metadata?.is_recording) {
      toast(i18n.t('room-metadata.session-recording'), {
        type: 'info',
      });
    } else if (isActiveRecording && !this._room.metadata?.is_recording) {
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
    if (!isActiveRtmpBroadcasting && this._room.metadata?.is_active_rtmp) {
      toast(i18n.t('room-metadata.rtmp-started'), {
        type: 'info',
      });
    } else if (
      isActiveRtmpBroadcasting &&
      !this._room.metadata?.is_active_rtmp
    ) {
      toast(i18n.t('room-metadata.rtmp-stopped'), {
        type: 'info',
      });
    }
  };

  private publishWelcomeMessage = () => {
    if (this.welcomeMessage !== undefined) {
      return;
    }

    if (
      !this._room.metadata?.welcome_message ||
      this._room.metadata?.welcome_message === ''
    ) {
      this.welcomeMessage = '';
      return;
    }

    this.welcomeMessage = this._room.metadata?.welcome_message;
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

    const whiteboard = this._room.metadata?.room_features.whiteboard_features;
    if (!whiteboard?.preload_file || whiteboard?.preload_file === '') {
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
