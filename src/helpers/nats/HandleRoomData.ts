import { toast } from 'react-toastify';
import {
  ChatMessageSchema,
  NatsKvRoomInfo,
  RoomMetadataSchema,
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
import { WhiteboardFileConversionRes } from '../../store/slices/interfaces/whiteboard';
import { sleep } from '../utils';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { createAndRegisterOfficeFile } from '../../components/whiteboard/helpers/handleFiles';

export default class HandleRoomData {
  private _room: ICurrentRoom;
  private welcomeMessage: string | undefined = undefined;
  private checkedPreloadedWhiteboardFile = false;
  private toastId: any = undefined;

  constructor() {
    this._room = {
      roomId: '',
      sid: '',
      metadata: undefined,
    };
  }

  public setRoomInfo = async (info: NatsKvRoomInfo): Promise<ICurrentRoom> => {
    this._room = {
      roomId: info.roomId,
      sid: info.roomSid,
    };
    store.dispatch(addCurrentRoom(this._room));
    await this.updateRoomMetadata(info.metadata);
    return this._room;
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
      this.addPreloadWhiteboardFile().then();
    }
  }

  private setWindowTitle = (title: string) => {
    window.document.title = title;
  };

  private showRecordingNotification = () => {
    // we should avoid notification is user is recorder.
    if (store.getState().session.currentUser?.isRecorder) {
      return;
    }

    const isActiveRecording = store.getState().session.isActiveRecording;
    if (!isActiveRecording && this._room.metadata?.isRecording) {
      store.dispatch(
        addUserNotification({
          message: i18n.t('room-metadata.session-recording'),
          typeOption: 'info',
        }),
      );
    } else if (isActiveRecording && !this._room.metadata?.isRecording) {
      store.dispatch(
        addUserNotification({
          message: i18n.t('room-metadata.session-not-recording'),
          typeOption: 'info',
        }),
      );
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
      store.dispatch(
        addUserNotification({
          message: i18n.t('room-metadata.rtmp-started'),
          typeOption: 'info',
        }),
      );
    } else if (isActiveRtmpBroadcasting && !this._room.metadata?.isActiveRtmp) {
      store.dispatch(
        addUserNotification({
          message: i18n.t('room-metadata.rtmp-stopped'),
          typeOption: 'info',
        }),
      );
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
    const body = create(ChatMessageSchema, {
      id: '1', // to make sure it's always on top
      sentAt: Date.now().toString(),
      isPrivate: false,
      fromName: 'system',
      fromUserId: 'system',
      message: this.welcomeMessage,
      fromAdmin: true, // system message always from admin
    });

    store.dispatch(addChatMessage(body));
  };

  private addPreloadWhiteboardFile = async () => {
    if (this.checkedPreloadedWhiteboardFile) {
      return;
    }
    // otherwise, current user info won't be updated
    // because we update room info first then local user info
    await sleep(2000);

    if (!store.getState().session.currentUser?.metadata?.isPresenter) {
      this.checkedPreloadedWhiteboardFile = true;
      return;
    }

    const whiteboard = this._room.metadata?.roomFeatures?.whiteboardFeatures;
    if (!whiteboard?.preloadFile || whiteboard.preloadFile === '') {
      // we don't have a preload file
      // or may be processing was not successful
      this.checkedPreloadedWhiteboardFile = true;
      if (this.toastId) {
        toast.dismiss(this.toastId);
        this.toastId = undefined;
      }
      return;
    }

    if (!whiteboard.fileName || whiteboard.fileName === '') {
      // we have preload file, but that wasn't ready
      // we'll wait until the new update arrives
      if (!this.toastId) {
        this.toastId = toast.loading(
          i18n.t('notifications.preloaded-whiteboard-file-processing'),
          {
            type: 'info',
            closeButton: true,
          },
        );
      }
      return;
    }

    const ff = whiteboard?.preloadFile?.split('/');
    if (!ff) {
      return;
    }
    const fileName = ff[ff.length - 1];

    if (fileName !== whiteboard?.fileName) {
      // maybe one new file was uploaded & we do not change it
      this.checkedPreloadedWhiteboardFile = true;
      if (this.toastId) {
        toast.dismiss(this.toastId);
        this.toastId = undefined;
      }
      return;
    }

    const whiteboardFiles =
      store.getState().whiteboard.whiteboardUploadedOfficeFiles;
    const exist = whiteboardFiles.find(
      (f) => f.fileId === whiteboard.whiteboardFileId,
    );
    if (!exist) {
      const f: WhiteboardFileConversionRes = {
        status: true,
        msg: '',
        fileId: whiteboard.whiteboardFileId,
        fileName: whiteboard.fileName,
        filePath: whiteboard.filePath,
        totalPages: whiteboard.totalPages,
      };
      createAndRegisterOfficeFile(f);
    }
    this.checkedPreloadedWhiteboardFile = true;

    if (this.toastId) {
      toast.dismiss(this.toastId);
      this.toastId = undefined;
    }
  };
}
