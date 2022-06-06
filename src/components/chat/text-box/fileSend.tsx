import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Room } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import {
  isSocketConnected,
  sendWebsocketMessage,
} from '../../../helpers/websocket';
import {
  DataMessageType,
  IChatMsg,
  IDataMessage,
} from '../../../store/slices/interfaces/dataMessages';
import useResumableFilesUpload from '../../../helpers/hooks/useResumableFilesUpload';
import { updateInitiatePrivateChat } from '../../../store/slices/roomSettingsSlice';

interface IFileSendProps {
  isChatServiceReady: boolean;
  lockSendFile: boolean;
  currentRoom: Room;
}

const selectedChatTabSelector = createSelector(
  (state: RootState) => state.roomSettings.selectedChatTab,
  (selectedChatTab) => selectedChatTab,
);
const initiatePrivateChatSelector = createSelector(
  (state: RootState) => state.roomSettings.initiatePrivateChat,
  (initiatePrivateChat) => initiatePrivateChat,
);

const FileSend = ({
  isChatServiceReady,
  lockSendFile,
  currentRoom,
}: IFileSendProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [files, setFiles] = useState<Array<File>>();
  const selectedChatTab = useAppSelector(selectedChatTabSelector);
  const initiatePrivateChat = useAppSelector(initiatePrivateChatSelector);
  const [sendTo, setSendTo] = useState<string>('public');

  const chat_features =
    store.getState().session.currentRoom.metadata?.room_features.chat_features;
  const accept =
    chat_features?.allowed_file_types?.map((type) => '.' + type).join(',') ??
    '*';
  const maxFileSize = chat_features?.max_file_size
    ? chat_features?.max_file_size
    : undefined;

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes: chat_features?.allowed_file_types ?? [],
    maxFileSize,
    files,
  });

  useEffect(() => {
    if (result && result.filePath && result.fileName) {
      publishToChat(result.filePath, result.fileName);
      toast(t('right-panel.file-upload-success'), {
        type: toast.TYPE.SUCCESS,
      });
    }
    //eslint-disable-next-line
  }, [result]);

  useEffect(() => {
    if (initiatePrivateChat.userId !== '') {
      setSendTo(initiatePrivateChat.userId);
    } else {
      setSendTo(selectedChatTab.userId);
    }
  }, [selectedChatTab, initiatePrivateChat]);

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

  const publishToChat = (filePath: string, fileName: string) => {
    if (!isSocketConnected()) {
      return;
    }

    const message = `<span class="download"> <i class="pnm-download"></i> <a href="${
      (window as any).PLUG_N_MEET_SERVER_URL +
      '/download/uploadedFile/' +
      filePath
    }" target="_blank">${fileName}</a></span>`;

    const info: IChatMsg = {
      type: 'CHAT',
      isPrivate: sendTo !== 'public',
      time: '',
      message_id: '',
      from: {
        sid: currentRoom.localParticipant.sid,
        userId: currentRoom.localParticipant.identity,
        name: currentRoom.localParticipant.name,
      },
      msg: message,
    };

    const data: IDataMessage = {
      type: DataMessageType.USER,
      room_sid: currentRoom.sid,
      to: sendTo !== 'public' ? sendTo : '',
      message_id: '',
      body: info,
    };

    sendWebsocketMessage(JSON.stringify(data));
    if (initiatePrivateChat.userId !== '') {
      dispatch(
        updateInitiatePrivateChat({
          userId: '',
          name: '',
        }),
      );
    }
  };

  const render = () => {
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
          disabled={!isChatServiceReady || lockSendFile || isUploading}
          onClick={() => openFileBrowser()}
          className="w-4 h-6 px-2"
        >
          <i className="pnm-attachment primaryColor text-[20px] opacity-50" />
        </button>
      </>
    );
  };

  return <>{render()}</>;
};

export default FileSend;
