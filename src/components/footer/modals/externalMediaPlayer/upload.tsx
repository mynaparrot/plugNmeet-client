import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import useResumableFilesUpload from '../../../../helpers/hooks/useResumableFilesUpload';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { updateShowExternalMediaPlayerModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../../store';

const Upload = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const inputFile = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Array<File>>();
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

  const openFileBrowser = () => {
    if (!isUploading) {
      inputFile.current?.click();
    }
  };

  const onChange = (e) => {
    const files = e.target.files;
    if (!files.length) {
      return;
    }
    setFiles([...files]);
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
        ref={inputFile}
        accept={allowedFileTypes.map((type) => '.' + type).join(',')}
        style={{ display: 'none' }}
        onChange={(e) => onChange(e)}
      />
      <button
        disabled={isUploading}
        onClick={() => openFileBrowser()}
        className="w-4 h-6 px-2"
      >
        {t('footer.modal.external-media-player-upload-file')}
      </button>
    </>
  );
};

export default Upload;
