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
import {
  addWhiteboardUploadedOfficeFile,
  updateCurrentWhiteboardOfficeFileId,
} from '../../store/slices/whiteboard';
import { DEFAULT_WHITEBOARD_OFFICE_FILE_ID } from '../../store/slices/interfaces/whiteboard';
import i18n from '../i18n';
import {
  addChatMessage,
  WELCOME_MESSAGE_ID,
} from '../../store/slices/chatMessagesSlice';
import { sleep } from '../utils';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';

export default class HandleRoomData {
  private _room: ICurrentRoom;
  private welcomeMessage: string | undefined = undefined;
  private checkedPreloadedWhiteboardFile = false;
  private toastId: any = undefined;
  private readonly userId: string;

  constructor(roomId: string, userId: string) {
    this._room = {
      roomId: roomId,
      sid: '',
      metadata: undefined,
    };
    this.userId = userId;
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
      const metadata = fromJsonString(RoomMetadataSchema, data, {
        ignoreUnknownFields: true,
      });
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
    // Seed the shared whiteboard file id from breakout room metadata (no-op in
    // normal rooms — see applyBreakoutWhiteboardFile). Placed here so the store
    // is populated before the whiteboard component mounts and closure-captures
    // the file id.
    this.applyBreakoutWhiteboardFile();
    if (!this.checkedPreloadedWhiteboardFile) {
      // we'll check whiteboard preloaded file
      this.addPreloadWhiteboardFile().then();
    }
  }

  /**
   * Breakout-room-only: when a child room was created with a whiteboard share,
   * seed the shared office file id from room metadata into the store so the
   * whiteboard component mounts against the shared file (not the 'default'
   * sentinel) and fetches the server-seeded per-page checkpoints.
   *
   * Restricted strictly to `isBreakoutRoom` — normal-room behavior is untouched.
   * Idempotent: the sentinel guard means re-runs (later ROOM_METADATA_UPDATE
   * events) are no-ops once a file has been selected via FILE_CHANGE/donor data.
   */
  private applyBreakoutWhiteboardFile() {
    const metadata = this._room.metadata;
    if (metadata?.isBreakoutRoom !== true) {
      return;
    }

    const features = metadata.roomFeatures?.whiteboardFeatures;
    if (!features) {
      return;
    }

    const fileId = features.whiteboardFileId;
    if (
      !fileId ||
      fileId === DEFAULT_WHITEBOARD_OFFICE_FILE_ID ||
      features.totalPages < 1
    ) {
      // No valid shared whiteboard file in the breakout metadata.
      return;
    }

    // Idempotency: never clobber a file already selected via FILE_CHANGE or
    // donor data. The sentinel means nothing has been chosen yet.
    if (
      store.getState().whiteboard.currentWhiteboardOfficeFileId !==
      DEFAULT_WHITEBOARD_OFFICE_FILE_ID
    ) {
      return;
    }

    const totalPages = features.totalPages;
    store.dispatch(
      addWhiteboardUploadedOfficeFile({
        fileId,
        fileName: features.fileName ?? '',
        filePath: features.filePath ?? '',
        totalPages,
        pageFiles: '',
        currentPage: 1,
      }),
    );
    store.dispatch(updateCurrentWhiteboardOfficeFileId({ fileId, page: 1 }));
  }

  private setWindowTitle(title: string) {
    window.document.title = title;
  }

  private showRecordingNotification() {
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
  }

  private showRTMPNotification() {
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
  }

  private publishWelcomeMessage() {
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
      id: WELCOME_MESSAGE_ID, // to make sure it's always on top
      sentAt: '1',
      isPrivate: false,
      fromName: 'system',
      fromUserId: 'system',
      message: this.welcomeMessage,
      fromAdmin: true, // system message always from admin
    });

    store.dispatch(
      addChatMessage({ message: body, currentUserId: this.userId }),
    );
  }

  private async addPreloadWhiteboardFile() {
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
    } else {
      if (!this.toastId) {
        this.toastId = toast.loading(
          i18n.t('notifications.preloaded-whiteboard-file-processing'),
          {
            type: 'info',
            closeButton: true,
          },
        );
      }
    }
  }
}
