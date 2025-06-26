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

const Upload = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [files, setFiles] = useState<Array<File>>();
  const [tmpFiles, setTmpFiles] = useState<Array<File>>();
  const allowedFileTypes = ['mp4', 'mp3', 'webm'];

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes: allowedFileTypes,
    maxFileSize: undefined,
    files,
  });

  useEffect(() => {
    const sendPlaybackLink = async (playBackUrl) => {
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

      sendPlaybackLink(playback);
    }
    //eslint-disable-next-line
  }, [result]);

  const upload = () => {
    if (!isUploading && tmpFiles) {
      setFiles([...tmpFiles]);
    }
  };

  const onChange = (e) => {
    const files = e.target.files;
    if (!files.length) {
      return;
    }
    setTmpFiles([...files]);
  };

  return (
    <>
      <div className="ex-m-p-file-upload relative h-[80px] mt-[10px] mb-[50px]">
        <div className="absolute -bottom-[30px] text-sm font-medium text-Gray-800">
          {t('footer.modal.external-media-player-upload-supported-files', {
            files: allowedFileTypes.map((type) => '.' + type).join(', '),
          })}
        </div>
        <input
          type="file"
          id="chat-file"
          accept={allowedFileTypes.map((type) => '.' + type).join(',')}
          onChange={(e) => onChange(e)}
          className="absolute left-0 w-full h-full top-0 py-[28px] px-5 border border-dashed border-Blue cursor-pointer rounded-sm focus:shadow-input-focus"
        />
      </div>
      <div className="mt-8 flex justify-end">
        <button
          className="h-9 w-1/2 flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
          disabled={isUploading}
          onClick={() => upload()}
        >
          {t('footer.modal.external-media-player-upload-file-play')}
        </button>
      </div>
    </>
  );
};

export default Upload;
