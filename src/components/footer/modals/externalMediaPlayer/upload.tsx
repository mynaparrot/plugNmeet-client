import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import useResumableFilesUpload from '../../../../helpers/hooks/useResumableFilesUpload';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';
import {
  CommonResponse,
  ExternalMediaPlayerReq,
  ExternalMediaPlayerTask,
} from '../../../../helpers/proto/plugnmeet_common_api_pb';

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

      const body = new ExternalMediaPlayerReq({
        task: ExternalMediaPlayerTask.START_PLAYBACK,
        url: playBackUrl,
      });
      const r = await sendAPIRequest(
        'externalMediaPlayer',
        body.toBinary(),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = CommonResponse.fromBinary(new Uint8Array(r));

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
        <div className="absolute -bottom-[30px] dark:text-darkText">
          {t('footer.modal.external-media-player-upload-supported-files', {
            files: allowedFileTypes.map((type) => '.' + type).join(', '),
          })}
        </div>
        <input
          type="file"
          id="chat-file"
          accept={allowedFileTypes.map((type) => '.' + type).join(',')}
          onChange={(e) => onChange(e)}
          className="absolute left-0 w-full h-full top-0 py-[28px] px-5 border border-dashed border-primaryColor dark:border-darkText dark:text-darkText cursor-pointer rounded"
        />
      </div>
      <div className="pb-3 pt-4 bg-gray-50 dark:bg-transparent text-right mt-4">
        <button
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none focus:ring-2 focus:ring-offset-2 focus:bg-secondaryColor"
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
