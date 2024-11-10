import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { AnalyticsEvents, AnalyticsEventType } from 'plugnmeet-protocol-js';

import { store, useAppSelector } from '../../../store';
import useResumableFilesUpload from '../../../helpers/hooks/useResumableFilesUpload';
import { getNatsConn } from '../../../helpers/nats';

interface IFileSendProps {
  lockSendFile: boolean;
}

const FileSend = ({ lockSendFile }: IFileSendProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const [files, setFiles] = useState<Array<File>>();
  const selectedChatOption = useAppSelector(
    (state) => state.roomSettings.selectedChatOption,
  );
  const conn = getNatsConn();

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
      publishToChat(result.filePath, result.fileName).then();
      toast(t('right-panel.file-upload-success'), {
        type: 'success',
      });
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

  const publishToChat = async (filePath: string, fileName: string) => {
    const message = `<a class="download flex items-center gap-3 break-all" href="${
      (window as any).PLUG_N_MEET_SERVER_URL +
      '/download/uploadedFile/' +
      filePath
    }" target="_blank">
    <span class="h-10 w-10 rounded-xl bg-Gray-50 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
  <path d="M3 12.1817C2.09551 11.5762 1.5 10.5452 1.5 9.375C1.5 7.61732 2.84363 6.17347 4.55981 6.01453C4.91086 3.8791 6.76518 2.25 9 2.25C11.2348 2.25 13.0891 3.8791 13.4402 6.01453C15.1564 6.17347 16.5 7.61732 16.5 9.375C16.5 10.5452 15.9045 11.5762 15 12.1817M6 12.75L9 15.75M9 15.75L12 12.75M9 15.75V9" stroke="#0C131A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg></span><span class="flex-1">${fileName}</span></a>`;

    await conn.sendChatMsg(selectedChatOption, message);

    // send analytics
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_CHAT_FILES,
      AnalyticsEventType.USER,
      fileName,
    );
  };

  return (
    <div className="attached-wrap w-9 h-9 flex items-center justify-center">
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
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
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
