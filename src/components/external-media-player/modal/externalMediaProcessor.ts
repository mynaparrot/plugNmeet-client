import { RoomUploadedFileType } from 'plugnmeet-protocol-js';
import { uploadResumableFile } from '../../../helpers/fileUpload';

export type ExternalMediaUploadStatus =
  'idle' | 'uploading' | 'success' | 'error';

export interface IExternalMediaUploadCallbacks {
  onStart(): void;
  onProgress(progress: number): void;
  onSuccess(fileId: string, fileName: string, filePath: string): void;
  onError(msg: string): void;
}

class ExternalMediaProcessor {
  private _isBusy = false;
  private uploadStatus: ExternalMediaUploadStatus = 'idle';
  private fileName = '';
  private fileSize = 0;
  private progress = 0;
  private activeCallbacks: IExternalMediaUploadCallbacks | null = null;

  public start = (
    file: File,
    allowedFileTypes: string[],
    callbacks: IExternalMediaUploadCallbacks,
  ) => {
    if (this._isBusy) {
      return;
    }

    this._isBusy = true;
    this.fileName = file.name;
    this.fileSize = file.size;
    this.uploadStatus = 'uploading';
    this.progress = 0;
    this.activeCallbacks = callbacks;

    callbacks.onStart();
    this.upload(file, allowedFileTypes);
  };

  // Allows UI components to re-register callbacks on mount if an upload is already running
  public registerCallbacks(callbacks: IExternalMediaUploadCallbacks) {
    this.activeCallbacks = callbacks;
  }

  public unregisterCallbacks() {
    this.activeCallbacks = null;
  }

  private cleanup() {
    this._isBusy = false;
    this.fileName = '';
    this.fileSize = 0;
    this.uploadStatus = 'idle';
    this.progress = 0;
    this.activeCallbacks = null;
  }

  private upload(file: File, allowedFileTypes: string[]) {
    uploadResumableFile(
      allowedFileTypes,
      undefined,
      RoomUploadedFileType.EXTERNAL_MEDIA_PLAYER_FILE,
      [file],
      (result) => {
        this.uploadStatus = 'success';
        this.progress = 100;
        if (this.activeCallbacks) {
          this.activeCallbacks.onSuccess(
            result.fileId,
            result.fileName,
            result.filePath,
          );
        }
        this.cleanup();
      },
      (isUploading) => {
        if (isUploading) {
          this.uploadStatus = 'uploading';
        }
      },
      (uploadProgress) => {
        this.progress = Math.round(uploadProgress * 100);
        if (this.activeCallbacks) {
          this.activeCallbacks.onProgress(this.progress);
        }
      },
      (errMsg) => {
        this.uploadStatus = 'error';
        if (this.activeCallbacks) {
          this.activeCallbacks.onError(errMsg);
        }
        // We don't clean up instantly so the user has a chance to see the error state.
      },
    );
  }

  public get isBusy() {
    return this._isBusy;
  }

  public get status() {
    return {
      status: this.uploadStatus,
      fileName: this.fileName,
      fileSize: this.fileSize,
      progress: this.progress,
    };
  }

  public reset() {
    this.cleanup();
  }
}

const externalMediaProcessor = new ExternalMediaProcessor();
export default externalMediaProcessor;
