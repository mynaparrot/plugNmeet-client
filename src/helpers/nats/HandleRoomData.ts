import { toast } from 'react-toastify';
import {
  RoomMetadataSchema,
  NatsKvRoomInfo,
  ChatMessageSchema,
} from 'plugnmeet-protocol-js';
import { create, fromJsonString } from '@bufbuild/protobuf';

import { ICurrentRoom } from '../../store/slices/interfaces/session';
import { store } from '../../store';
import {
  addCurrentRoom,
  updateCurrentRoomMetadata,
} from '../../store/slices/sessionSlice';
import i18n from '../i18n';
import { addChatMessage } from '../../store/slices/chatMessagesSlice';
import { handleToAddWhiteboardUploadedOfficeNewFile } from '../../components/whiteboard/helpers/utils';
import { IWhiteboardFeatures } from '../../store/slices/interfaces/whiteboard';

export default class HandleRoomData {
  private _room: ICurrentRoom;
  private welcomeMessage: string | undefined = undefined;
  private checkedPreloadedWhiteboardFile = false;

  constructor() {
    this._room = {
      roomId: '',
      sid: '',
      metadata: undefined,
    };
  }

  get roomInfo(): ICurrentRoom {
    return this._room;
  }

  public setRoomInfo = async (info: NatsKvRoomInfo) => {
    this._room = {
      roomId: info.roomId,
      sid: info.roomSid,
    };
    store.dispatch(addCurrentRoom(this._room));
    await this.updateRoomMetadata(info.metadata);
  };

  public updateRoomMetadata = async (data: string) => {
    try {
      const metadata = fromJsonString(RoomMetadataSchema, data);
      if (
        typeof this._room.metadata === 'undefined' ||
        this._room.metadata.metadataId !== metadata.metadataId
      ) {
        this._room.metadata = metadata;
        await this.updateMetadata();
      }
    } catch (e) {
      console.error(e);
    }
  };

  private async updateMetadata() {
    if (typeof this._room.metadata === 'undefined') {
      return;
    }

    this.setWindowTitle(this._room.metadata.roomTitle);
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
    if (!isActiveRecording && this._room.metadata?.isRecording) {
      toast(i18n.t('room-metadata.session-recording'), {
        type: 'info',
      });
    } else if (isActiveRecording && !this._room.metadata?.isRecording) {
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
    if (!isActiveRtmpBroadcasting && this._room.metadata?.isActiveRtmp) {
      toast(i18n.t('room-metadata.rtmp-started'), {
        type: 'info',
      });
    } else if (isActiveRtmpBroadcasting && !this._room.metadata?.isActiveRtmp) {
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
      !this._room.metadata?.welcomeMessage ||
      this._room.metadata?.welcomeMessage === ''
    ) {
      this.welcomeMessage = '';
      return;
    }

    this.welcomeMessage = this._room.metadata?.welcomeMessage;
    const now = new Date();
    const body = create(ChatMessageSchema, {
      id: `${now.getMilliseconds()}`,
      sentAt: `${now.getMilliseconds()}`,
      isPrivate: false,
      fromName: 'system',
      fromUserId: 'system',
      message: this.welcomeMessage,
    });

    store.dispatch(addChatMessage(body));
  };

  private addPreloadWhiteboardFile = async () => {
    if (!store.getState().session.currentUser?.metadata?.isPresenter) {
      this.checkedPreloadedWhiteboardFile = true;
      return;
    }

    const whiteboard = this._room.metadata?.roomFeatures?.whiteboardFeatures;
    if (!whiteboard?.preloadFile || whiteboard?.preloadFile === '') {
      this.checkedPreloadedWhiteboardFile = true;
      return;
    }

    const ff = whiteboard?.preloadFile?.split('/');
    if (!ff) {
      return;
    }
    const fileName = ff[ff.length - 1];

    if (fileName !== whiteboard?.fileName) {
      this.checkedPreloadedWhiteboardFile = true;
      return;
    }

    const whiteboardFiles =
      store.getState().whiteboard.whiteboardUploadedOfficeFiles;
    const exist = whiteboardFiles.find(
      (f) => f.fileId === whiteboard.whiteboardFileId,
    );
    if (!exist) {
      const f: IWhiteboardFeatures = {
        whiteboard_file_id: whiteboard.whiteboardFileId,
        file_name: whiteboard.fileName,
        file_path: whiteboard.filePath,
        total_pages: whiteboard.totalPages,
      };
      handleToAddWhiteboardUploadedOfficeNewFile(f);
    }
    this.checkedPreloadedWhiteboardFile = true;
  };
}
