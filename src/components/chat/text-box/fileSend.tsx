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
    const message = `<span class="download"> <i class="pnm-download"></i> <a href="${
      (window as any).PLUG_N_MEET_SERVER_URL +
      '/download/uploadedFile/' +
      filePath
    }" target="_blank">${fileName}</a></span>`;

    await conn.sendChatMsg(selectedChatOption, message);

    // send analytics
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_CHAT_FILES,
      AnalyticsEventType.USER,
      fileName,
    );
  };

  return (
    <>
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
        className="w-4 h-6 px-2"
      >
        <i className="pnm-attachment primaryColor text-[20px] opacity-50 dark:text-secondaryColor" />
      </button>
    </>
  );
};

export default FileSend;
