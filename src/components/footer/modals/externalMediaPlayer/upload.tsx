import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

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

      const body = {
        task: 'start-playback',
        url: playBackUrl,
      };
      const res = await sendAPIRequest('externalMediaPlayer', body);

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
      <div>
        {t('footer.modal.external-media-player-upload-supported-files', {
          files: allowedFileTypes.map((type) => '.' + type).join(', '),
        })}
      </div>
      <input
        type="file"
        id="chat-file"
        accept={allowedFileTypes.map((type) => '.' + type).join(',')}
        onChange={(e) => onChange(e)}
      />
      <div className="pb-3 pt-4 bg-gray-50 text-right mt-4">
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
