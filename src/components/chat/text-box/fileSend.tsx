import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatFeatures, RoomUploadedFileType } from 'plugnmeet-protocol-js';

import { useAppDispatch } from '../../../store';
import useResumableFilesUpload from '../../../helpers/hooks/useResumableFilesUpload';
import { publishFileAttachmentToChat } from '../utils';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { LoadingIcon } from '../../../assets/Icons/Loading';

interface IFileSendProps {
  lockSendFile: boolean;
  chatFeatures: ChatFeatures | undefined;
}

const FileSend = ({ lockSendFile, chatFeatures }: IFileSendProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [files, setFiles] = useState<Array<File>>();

  const { accept, maxFileSize, canUpload } = useMemo(() => {
    const allowedTypes = chatFeatures?.allowedFileTypes;
    const canUpload = Array.isArray(allowedTypes) && allowedTypes.length > 0;
    const accept = canUpload
      ? allowedTypes.map((type) => '.' + type).join(',')
      : '';
    return { accept, maxFileSize: chatFeatures?.maxFileSize, canUpload };
  }, [chatFeatures?.allowedFileTypes, chatFeatures?.maxFileSize]);

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes: chatFeatures?.allowedFileTypes ?? [],
    maxFileSize,
    files,
    fileType: RoomUploadedFileType.CHAT_FILE,
  });

  useEffect(() => {
    if (result && result.filePath && result.fileName) {
      publishFileAttachmentToChat(result.filePath, result.fileName).then();
      dispatch(
        addUserNotification({
          message: t('right-panel.file-upload-success'),
          typeOption: 'success',
        }),
      );
    }
    //eslint-disable-next-line
  }, [result]);

  const openFileBrowser = () => {
    if (!isUploading) {
      inputFile.current?.click();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) {
      return;
    }
    setFiles([...files]);
  };

  return (
    <div className="attached-wrap w-7 3xl:w-9 h-7 3xl:h-9 flex items-center justify-center">
      <input
        type="file"
        id="chat-file"
        ref={inputFile}
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => onChange(e)}
      />
      <button
        disabled={lockSendFile || isUploading || !canUpload}
        onClick={() => openFileBrowser()}
        className=""
      >
        {isUploading ? (
          <LoadingIcon
            className={'inline w-4 h-4 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 18 18"
            fill="none"
            className="h-auto w-4 3xl:w-[18px]"
          >
            <path
              d="M13.125 3.94186V12.375C13.125 14.6532 11.2782 16.5 9 16.5C6.72183 16.5 4.875 14.6532 4.875 12.375V4.25C4.875 2.73122 6.10622 1.5 7.625 1.5C9.14378 1.5 10.375 2.73122 10.375 4.25V12.3343C10.375 13.0937 9.75939 13.7093 9 13.7093C8.24061 13.7093 7.625 13.0937 7.625 12.3343V4.98837"
              stroke="#0C131A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default FileSend;
