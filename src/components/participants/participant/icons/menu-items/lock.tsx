import React from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  UpdateUserLockSettingsReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { ICurrentUserMetadata } from '../../../../../store/slices/interfaces/session';

interface ILockSettingMenuItemProps {
  userId: string;
}
const LockSettingMenuItem = ({ userId }: ILockSettingMenuItemProps) => {
  const roomFeatures =
    store.getState().session.currentRoom.metadata?.roomFeatures;
  const { t } = useTranslation();

  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const onClick = async (task: string) => {
    const metadata: ICurrentUserMetadata = (participant as any).metadata;
    const session = store.getState().session;
    const service = task;
    let direction = 'lock';

    switch (task) {
      case 'mic':
        direction = metadata?.lockSettings?.lockMicrophone ? 'unlock' : 'lock';
        break;
      case 'webcam':
        direction = metadata?.lockSettings?.lockWebcam ? 'unlock' : 'lock';
        break;
      case 'screenShare':
        direction = metadata?.lockSettings?.lockScreenSharing
          ? 'unlock'
          : 'lock';
        break;
      case 'whiteboard':
        direction = metadata?.lockSettings?.lockWhiteboard ? 'unlock' : 'lock';
        break;
      case 'sharedNotepad':
        direction = metadata?.lockSettings?.lockSharedNotepad
          ? 'unlock'
          : 'lock';
        break;
      case 'chat':
        direction = metadata?.lockSettings?.lockChat ? 'unlock' : 'lock';
        break;
      case 'sendChatMsg':
        direction = metadata?.lockSettings?.lockChatSendMessage
          ? 'unlock'
          : 'lock';
        break;
      case 'chatFile':
        direction = metadata?.lockSettings?.lockChatFileShare
          ? 'unlock'
          : 'lock';
        break;
    }

    const body = create(UpdateUserLockSettingsReqSchema, {
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: participant?.userId,
      service,
      direction,
    });

    const r = await sendAPIRequest(
      'updateLockSettings',
      toBinary(UpdateUserLockSettingsReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(t('left-panel.menus.notice.applied-new-setting'), {
        toastId: 'lock-setting-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
  };

  const render = () => {
    return (
      <>
        <div className="" role="none">
          <MenuItem>
            {() => (
              <button
                className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                onClick={() => onClick('mic')}
              >
                {participant?.metadata.lockSettings?.lockMicrophone
                  ? t('left-panel.menus.items.unlock-microphone')
                  : t('left-panel.menus.items.lock-microphone')}
              </button>
            )}
          </MenuItem>
        </div>

        {roomFeatures?.allowWebcams && !roomFeatures?.adminOnlyWebcams ? (
          <div className="" role="none">
            <MenuItem>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('webcam')}
                >
                  {participant?.metadata.lockSettings?.lockWebcam
                    ? t('left-panel.menus.items.unlock-webcam')
                    : t('left-panel.menus.items.lock-webcam')}
                </button>
              )}
            </MenuItem>
          </div>
        ) : null}

        {roomFeatures?.allowScreenShare ? (
          <div className="" role="none">
            <MenuItem>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('screenShare')}
                >
                  {participant?.metadata.lockSettings?.lockScreenSharing
                    ? t('left-panel.menus.items.unlock-screen-sharing')
                    : t('left-panel.menus.items.lock-screen-sharing')}
                </button>
              )}
            </MenuItem>
          </div>
        ) : null}

        {roomFeatures?.whiteboardFeatures?.allowedWhiteboard ? (
          <div className="" role="none">
            <MenuItem>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('whiteboard')}
                >
                  {participant?.metadata.lockSettings?.lockWhiteboard
                    ? t('left-panel.menus.items.unlock-whiteboard')
                    : t('left-panel.menus.items.lock-whiteboard')}
                </button>
              )}
            </MenuItem>
          </div>
        ) : null}

        {roomFeatures?.sharedNotePadFeatures?.allowedSharedNotePad ? (
          <div className="" role="none">
            <MenuItem>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('sharedNotepad')}
                >
                  {participant?.metadata.lockSettings?.lockSharedNotepad
                    ? t('left-panel.menus.items.unlock-shared-notepad')
                    : t('left-panel.menus.items.lock-shared-notepad')}
                </button>
              )}
            </MenuItem>
          </div>
        ) : null}

        {roomFeatures?.chatFeatures?.allowChat ? (
          <>
            <div className="" role="none">
              <MenuItem>
                {() => (
                  <button
                    className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                    onClick={() => onClick('chat')}
                  >
                    {participant?.metadata.lockSettings?.lockChat
                      ? t('left-panel.menus.items.unlock-chat')
                      : t('left-panel.menus.items.lock-chat')}
                  </button>
                )}
              </MenuItem>
            </div>

            <div className="" role="none">
              <MenuItem>
                {() => (
                  <button
                    className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                    onClick={() => onClick('sendChatMsg')}
                  >
                    {participant?.metadata.lockSettings?.lockChatSendMessage
                      ? t('left-panel.menus.items.unlock-send-chat-message')
                      : t('left-panel.menus.items.lock-send-chat-message')}
                  </button>
                )}
              </MenuItem>
            </div>

            {roomFeatures.chatFeatures.allowFileUpload ? (
              <div className="" role="none">
                <MenuItem>
                  {() => (
                    <button
                      className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                      onClick={() => onClick('chatFile')}
                    >
                      {participant?.metadata.lockSettings?.lockChatFileShare
                        ? t('left-panel.menus.items.unlock-send-file')
                        : t('left-panel.menus.items.lock-send-file')}
                    </button>
                  )}
                </MenuItem>
              </div>
            ) : null}
          </>
        ) : null}
      </>
    );
  };

  return render();
};

export default LockSettingMenuItem;
