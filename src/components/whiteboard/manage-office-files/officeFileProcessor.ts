import { toast } from 'react-toastify';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  RoomUploadedFileType,
} from 'plugnmeet-protocol-js';

import { uploadResumableFile } from '../../../helpers/fileUpload';
import { store } from '../../../store';
import {
  WhiteboardFileConversionReq,
  WhiteboardFileConversionRes,
} from '../../../store/slices/interfaces/whiteboard';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import i18n from '../../../helpers/i18n';
import { createAndRegisterOfficeFile } from '../helpers/handleFiles';
import { getNatsConn } from '../../../helpers/nats';
import { sleep } from '../../../helpers/utils';

export type OfficeFileStatus =
  'idle' | 'uploading' | 'converting' | 'success' | 'error';

export interface IOfficeFileProcessing {
  onProgress(progress: number): void;
  onSuccess(fileName: string): void;
  onError(msg: string): void;
  onStart(): void;
}

class OfficeFileProcessor {
  private _isBusy = false;
  private fileStatus: OfficeFileStatus = 'idle';
  private fileName = '';
  private fileSize = 0;
  private progress = 0;

  public start = (
    file: File,
    excalidrawAPI: ExcalidrawImperativeAPI,
    allowedFileTypes: string[],
    maxAllowedFileSize: string,
    callbacks: IOfficeFileProcessing,
  ) => {
    if (this._isBusy) {
      return;
    }

    this._isBusy = true;
    this.fileName = file.name;
    this.fileSize = file.size;
    this.fileStatus = 'uploading';
    this.progress = 0;
    callbacks.onStart();

    this.upload(
      file,
      excalidrawAPI,
      allowedFileTypes,
      maxAllowedFileSize,
      callbacks,
    );
  };

  private cleanup() {
    this._isBusy = false;
    this.fileName = '';
    this.fileSize = 0;
    this.fileStatus = 'idle';
    this.progress = 0;
  }

  private upload(
    file: File,
    excalidrawAPI: ExcalidrawImperativeAPI,
    allowedFileTypes: string[],
    maxAllowedFileSize: string,
    callbacks: IOfficeFileProcessing,
  ) {
    const files: File[] = [file];

    uploadResumableFile(
      allowedFileTypes,
      maxAllowedFileSize,
      RoomUploadedFileType.WHITEBOARD_CONVERTED_FILE,
      files,
      (result) => this.convertFile(result.filePath, excalidrawAPI, callbacks),
      () => {},
      (uploadProgress) => {
        this.progress = Math.round(uploadProgress * 100);
        callbacks.onProgress(this.progress);
      },
      (errMsg) => {
        this.fileStatus = 'error';
        callbacks.onError(errMsg);
        this.cleanup();
      },
    );
  }

  private async convertFile(
    filePath: string,
    excalidrawAPI: ExcalidrawImperativeAPI,
    callbacks: IOfficeFileProcessing,
  ) {
    const id = toast.loading(i18n.t('whiteboard.converting'), {
      type: 'info',
    });
    this.fileStatus = 'converting';
    this.progress = 100;
    callbacks.onProgress(100);

    const { currentRoom, currentUser } = store.getState().session;
    const body: WhiteboardFileConversionReq = {
      roomSid: currentRoom.sid,
      roomId: currentRoom.roomId,
      userId: currentUser?.userId ?? '',
      filePath: filePath,
    };

    const res: WhiteboardFileConversionRes = await sendAPIRequest(
      'whiteboard/convert',
      body,
    );
    if (!res.status || res.fileId === '' || res.totalPages == 0) {
      let msg = i18n.t(res.msg);
      if (res.fileId === '' || res.totalPages == 0) {
        msg = i18n.t('whiteboard.file-conversion-failed');
      }

      this.fileStatus = 'error';
      callbacks.onError(msg);
      toast.update(id, {
        render: i18n.t(msg),
        type: 'error',
        isLoading: false,
        closeButton: true,
      });
      this.cleanup();
      return;
    }

    const newFile = createAndRegisterOfficeFile(
      res,
      excalidrawAPI.getAppState().height,
      excalidrawAPI.getAppState().width,
    );

    const conn = getNatsConn();
    // send analytics
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_WHITEBOARD_FILES,
      AnalyticsEventType.USER,
      newFile.fileName,
    );
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_WHITEBOARD_FILES,
      AnalyticsEventType.ROOM,
      newFile.fileName,
    );

    toast.update(id, {
      render: i18n.t('whiteboard.file-ready'),
      type: 'success',
      isLoading: false,
      autoClose: 1000,
    });
    this.fileStatus = 'success';
    callbacks.onSuccess(i18n.t('whiteboard.file-ready'));
    await sleep(1000);
    this.cleanup();
  }

  public get isBusy() {
    return this._isBusy;
  }

  public get status() {
    return {
      status: this.fileStatus,
      fileName: this.fileName,
      fileSize: this.fileSize,
      progress: this.progress,
    };
  }
}

const officeFileProcessor = new OfficeFileProcessor();

export const startProcessing = officeFileProcessor.start;
export const getIsAnyFileProcessing = () => officeFileProcessor.isBusy;
export const getProcessorStatus = () => officeFileProcessor.status;
