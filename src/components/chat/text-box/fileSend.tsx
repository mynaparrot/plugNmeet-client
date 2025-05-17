import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../../store';
import useResumableFilesUpload from '../../../helpers/hooks/useResumableFilesUpload';
import { publishFileAttachmentToChat } from '../utils';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

interface IFileSendProps {
  lockSendFile: boolean;
}

const FileSend = ({ lockSendFile }: IFileSendProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [files, setFiles] = useState<Array<File>>();

  const chat_features =
    store.getState().session.currentRoom.metadata?.roomFeatures?.chatFeatures;
  const accept =
    chat_features?.allowedFileTypes?.map((type) => '.' + type).join(',') ?? '*';
  const maxFileSize = chat_features?.maxFileSize
    ? chat_features?.maxFileSize
    : undefined;

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes: chat_features?.allowedFileTypes ?? [],
    maxFileSize,
    files,
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

  const onChange = (e: any) => {
    const files = e.target.files;
    if (!files.length) {
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
        disabled={lockSendFile || isUploading}
        onClick={() => openFileBrowser()}
        className=""
      >
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
      </button>
    </div>
  );
};

export default FileSend;
