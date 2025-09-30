import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalMediaPlayerReqSchema,
  ExternalMediaPlayerTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import useResumableFilesUpload from '../../../../helpers/hooks/useResumableFilesUpload';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';
import ActionButton from '../../../../helpers/ui/actionButton';

const Upload = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [files, setFiles] = useState<Array<File>>();
  const allowedFileTypes = ['mp4', 'mp3', 'webm'];

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes: allowedFileTypes,
    maxFileSize: undefined,
    files,
  });

  const isFileSelected = files && files.length > 0;

  useEffect(() => {
    const sendPlaybackLink = async (playBackUrl: string) => {
      // if the modal is already closed, we don't need to do anything.
      // This can happen if the user closes the modal while the file is uploading.
      const id = toast.loading(
        t('footer.notice.external-media-player-starting'),
        {
          type: 'info',
        },
      );

      const body = create(ExternalMediaPlayerReqSchema, {
        task: ExternalMediaPlayerTask.START_PLAYBACK,
        url: playBackUrl,
      });
      const r = await sendAPIRequest(
        'externalMediaPlayer',
        toBinary(ExternalMediaPlayerReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (!res.status) {
        toast.update(id, {
          render: t(res.msg),
          type: 'error',
          isLoading: false,
          autoClose: 1000,
        });
      }

      toast.dismiss(id);
      dispatch(updateShowExternalMediaPlayerModal(false));
    };

    if (result && result.filePath) {
      const playback =
        (window as any).PLUG_N_MEET_SERVER_URL +
        '/download/uploadedFile/' +
        result.filePath;

      sendPlaybackLink(playback).then();
    }
  }, [result, t, dispatch]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      setFiles([...files]);
    }
  };

  return (
    <>
      <div className="upload-area relative h-20 mt-2.5 mb-12">
        <div className="absolute -bottom-7 text-sm font-medium text-Gray-800">
          {t('footer.modal.external-media-player-upload-supported-files', {
            files: allowedFileTypes.map((type) => '.' + type).join(', '),
          })}
        </div>
        <input
          type="file"
          id="media-file"
          accept={allowedFileTypes.map((type) => '.' + type).join(',')}
          onChange={(e) => onChange(e)}
          className="absolute left-0 w-full h-full top-0 opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <label
          htmlFor="media-file"
          className="w-full h-full py-7 px-5 border border-dashed border-Blue cursor-pointer rounded-sm focus:shadow-input-focus flex items-center justify-center text-center text-Gray-800"
        >
          {isFileSelected
            ? files[0].name
            : t('footer.modal.external-media-player-select-file')}
        </label>
      </div>
      <div className="mt-8 flex justify-end">
        <ActionButton isLoading={isUploading} disabled={!isFileSelected}>
          {t('footer.modal.external-media-player-play')}
        </ActionButton>
      </div>
    </>
  );
};

export default Upload;
