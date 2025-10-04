import React, { DragEvent, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RoomUploadedFileType } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../store';
import TextBoxArea from './text-box';
import ChatTabs from './chatTabs';
import { publishFileAttachmentToChat } from './utils';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { uploadResumableFile } from '../../helpers/fileUpload';

const ChatComponent = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // Values that can change during the session (e.g., admin changes lock settings)
  const isChatLocked = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockChat,
  );
  const isLockChatSendMessage = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatSendMessage,
  );
  const isLockChatFileShare = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatFileShare,
  );
  const defaultLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );

  // Values that are static for the session
  const session = store.getState().session;
  const isRecorder = session.currentUser?.isRecorder;
  const isAdmin = session.currentUser?.metadata?.isAdmin;
  const chatFeatures = session.currentRoom.metadata?.roomFeatures?.chatFeatures;

  const canShowChatInput = useMemo(() => {
    // Recorders can never chat.
    if (isRecorder) {
      return false;
    }
    // Admins can always chat (unless they are a recorder, which is handled above).
    if (isAdmin) {
      return true;
    }

    // Determine the final lock status by respecting user-specific overrides.
    let finalChatLockStatus = defaultLockSettings?.lockChat;
    if (typeof isChatLocked !== 'undefined') {
      // User-specific setting takes precedence.
      finalChatLockStatus = isChatLocked;
    }

    let finalMsgSendLockStatus = defaultLockSettings?.lockChatSendMessage;
    if (typeof isLockChatSendMessage !== 'undefined') {
      // User-specific setting takes precedence.
      finalMsgSendLockStatus = isLockChatSendMessage;
    }

    // A non-admin can chat if neither the chat feature nor message sending is locked.
    return !finalChatLockStatus && !finalMsgSendLockStatus;
  }, [
    isRecorder,
    isAdmin,
    isChatLocked,
    isLockChatSendMessage,
    defaultLockSettings,
  ]);

  const handleOnDrop = (e: DragEvent) => {
    e.preventDefault();

    if (isLockChatSendMessage || isLockChatFileShare) {
      return;
    }

    if (e.dataTransfer && e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length) {
        uploadResumableFile(
          chatFeatures?.allowedFileTypes ?? [],
          chatFeatures?.maxFileSize,
          RoomUploadedFileType.CHAT_FILE,
          files,
          (result) => {
            publishFileAttachmentToChat(result.filePath, result.fileName).then(
              () =>
                dispatch(
                  addUserNotification({
                    message: t('right-panel.file-upload-success'),
                    typeOption: 'success',
                  }),
                ),
            );
          },
        );
      }
    }
  };

  return (
    <div
      className="relative z-10 w-full bg-Gray-25 border-l border-Gray-200 h-full"
      onDrop={handleOnDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="h-full">
        <div className="all-MessageModule-wrap h-full">
          <ChatTabs />
        </div>
      </div>
      {isRecorder && (
        <div className="w-full h-px hiddenAnimation absolute z-50 bottom-0 bg-linear-to-r from-primary-color to-secondary-color" />
      )}
      {canShowChatInput && (
        <div className="message-form absolute bottom-0 z-30 border-t border-Gray-200 bg-white w-full px-3 3xl:px-5 py-2 3xl:py-4 flex items-center">
          <TextBoxArea />
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
