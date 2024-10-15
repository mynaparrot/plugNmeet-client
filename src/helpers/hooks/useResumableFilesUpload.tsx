import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Resumable from 'resumablejs';
import ResumableFile = Resumable.ResumableFile;

import { store } from '../../store';
import sendAPIRequest from '../api/plugNmeetAPI';

export interface IUseResumableFilesUpload {
  allowedFileTypes: Array<string>;
  maxFileSize: string | undefined;
  files: Array<File> | undefined;
}
export interface IUseResumableFilesUploadResult {
  filePath?: string;
  fileName?: string;
  fileExtension?: string;
}

const useResumableFilesUpload = ({
  allowedFileTypes,
  maxFileSize,
  files,
}: IUseResumableFilesUpload) => {
  const toastId = React.useRef<string>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<IUseResumableFilesUploadResult>();

  const { t } = useTranslation();
  const session = store.getState().session;

  useEffect(() => {
    if (files && files.length) {
      sendFile(files);
    }
    //eslint-disable-next-line
  }, [files]);

  const sendFile = (files: Array<File>) => {
    let fileName = '';

    const r = new Resumable({
      target: (window as any).PLUG_N_MEET_SERVER_URL + '/api/fileUpload',
      uploadMethod: 'POST',
      query: {
        roomSid: session.currentRoom.sid,
        roomId: session.currentRoom.roomId,
        userId: session.currentUser?.userId,
        resumable: true,
      },
      headers: {
        Authorization: session.token,
      },
      fileType: allowedFileTypes,
      prioritizeFirstAndLastChunk: true,
      fileTypeErrorCallback(file) {
        toast(t('notifications.file-type-not-allow', { filetype: file.type }), {
          type: 'error',
        });
      },

      // @ts-expect-error actually value exist
      maxFileSize: maxFileSize ? Number(maxFileSize) * 1000000 : undefined,
      maxFileSizeErrorCallback() {
        toast(t('notifications.max-file-size-exceeds'), {
          type: 'error',
        });
      },
    });

    r.on('fileAdded', function (file) {
      fileName = file.fileName;
      if (!r.isUploading()) {
        setIsUploading(true);
        r.upload();
      }
    });

    r.on('fileSuccess', async (file: ResumableFile) => {
      // file was uploaded successfully
      // now we'll send merge request
      const mergeReq = {
        roomSid: session.currentRoom.sid,
        roomId: session.currentRoom.roomId,
        resumableIdentifier: file.uniqueIdentifier,
        resumableFilename: file.fileName,
        resumableTotalChunks: file.chunks.length,
      };
      const res = await sendAPIRequest('/uploadedFileMerge', mergeReq, true);

      setIsUploading(false);
      setTimeout(() => {
        toast.dismiss(toastId.current ?? '');
      }, 300);

      if (res.status) {
        setResult({
          filePath: res.filePath,
          fileName: res.fileName,
          fileExtension: res.fileExtension,
        });
      } else {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    });

    r.on('fileError', function (file, message) {
      setIsUploading(false);

      setTimeout(() => {
        toast.dismiss(toastId.current ?? '');
      }, 300);

      try {
        const res = JSON.parse(message);
        toast(t(res.msg), {
          type: 'error',
        });
      } catch (e) {
        console.error(e);
        toast(t('right-panel.file-upload-default-error'), {
          type: 'error',
        });
      }
    });

    r.on('uploadStart', function () {
      // @ts-expect-error this value exists
      toastId.current = toast(
        t('right-panel.uploading-file', {
          fileName,
        }),
        {
          closeButton: false,
          progress: 0,
        },
      );
    });

    r.on('fileProgress', function (file) {
      const progress = file.progress(false);
      toast.update(toastId.current ?? '', {
        progress: Number(progress),
      });
    });

    r.addFiles(files);
  };

  return {
    isUploading,
    result,
  };
};

export default useResumableFilesUpload;
