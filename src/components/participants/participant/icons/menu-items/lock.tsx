import React from 'react';
import { Menu } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { ICurrentUserMetadata } from '../../../../../store/slices/interfaces/session';
import {
  CommonResponse,
  UpdateUserLockSettingsReq,
} from '../../../../../helpers/proto/plugnmeet_common_api_pb';

interface ILockSettingMenuItemProps {
  userId: string;
}
const LockSettingMenuItem = ({ userId }: ILockSettingMenuItemProps) => {
  const roomFeatures =
    store.getState().session.currentRoom.metadata?.room_features;
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
        direction = metadata?.lock_settings.lock_microphone ? 'unlock' : 'lock';
        break;
      case 'webcam':
        direction = metadata?.lock_settings.lock_webcam ? 'unlock' : 'lock';
        break;
      case 'screenShare':
        direction = metadata?.lock_settings.lock_screen_sharing
          ? 'unlock'
          : 'lock';
        break;
      case 'whiteboard':
        direction = metadata?.lock_settings.lock_whiteboard ? 'unlock' : 'lock';
        break;
      case 'sharedNotepad':
        direction = metadata?.lock_settings.lock_shared_notepad
          ? 'unlock'
          : 'lock';
        break;
      case 'chat':
        direction = metadata?.lock_settings.lock_chat ? 'unlock' : 'lock';
        break;
      case 'sendChatMsg':
        direction = metadata?.lock_settings.lock_chat_send_message
          ? 'unlock'
          : 'lock';
        break;
      case 'chatFile':
        direction = metadata?.lock_settings.lock_chat_file_share
          ? 'unlock'
          : 'lock';
        break;
    }

    const body = new UpdateUserLockSettingsReq({
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      userId: participant?.userId,
      service,
      direction,
    });

    const r = await sendAPIRequest(
      'updateLockSettings',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

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
          <Menu.Item>
            {() => (
              <button
                className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                onClick={() => onClick('mic')}
              >
                {participant?.metadata.lock_settings.lock_microphone
                  ? t('left-panel.menus.items.unlock-microphone')
                  : t('left-panel.menus.items.lock-microphone')}
              </button>
            )}
          </Menu.Item>
        </div>

        {roomFeatures?.allow_webcams && !roomFeatures?.admin_only_webcams ? (
          <div className="" role="none">
            <Menu.Item>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('webcam')}
                >
                  {participant?.metadata.lock_settings.lock_webcam
                    ? t('left-panel.menus.items.unlock-webcam')
                    : t('left-panel.menus.items.lock-webcam')}
                </button>
              )}
            </Menu.Item>
          </div>
        ) : null}

        {roomFeatures?.allow_screen_share ? (
          <div className="" role="none">
            <Menu.Item>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('screenShare')}
                >
                  {participant?.metadata.lock_settings.lock_screen_sharing
                    ? t('left-panel.menus.items.unlock-screen-sharing')
                    : t('left-panel.menus.items.lock-screen-sharing')}
                </button>
              )}
            </Menu.Item>
          </div>
        ) : null}

        {roomFeatures?.whiteboard_features.allowed_whiteboard ? (
          <div className="" role="none">
            <Menu.Item>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('whiteboard')}
                >
                  {participant?.metadata.lock_settings.lock_whiteboard
                    ? t('left-panel.menus.items.unlock-whiteboard')
                    : t('left-panel.menus.items.lock-whiteboard')}
                </button>
              )}
            </Menu.Item>
          </div>
        ) : null}

        {roomFeatures?.shared_note_pad_features.allowed_shared_note_pad ? (
          <div className="" role="none">
            <Menu.Item>
              {() => (
                <button
                  className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                  onClick={() => onClick('sharedNotepad')}
                >
                  {participant?.metadata.lock_settings.lock_shared_notepad
                    ? t('left-panel.menus.items.unlock-shared-notepad')
                    : t('left-panel.menus.items.lock-shared-notepad')}
                </button>
              )}
            </Menu.Item>
          </div>
        ) : null}

        {roomFeatures?.chat_features.allow_chat ? (
          <>
            <div className="" role="none">
              <Menu.Item>
                {() => (
                  <button
                    className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                    onClick={() => onClick('chat')}
                  >
                    {participant?.metadata.lock_settings.lock_chat
                      ? t('left-panel.menus.items.unlock-chat')
                      : t('left-panel.menus.items.lock-chat')}
                  </button>
                )}
              </Menu.Item>
            </div>

            <div className="" role="none">
              <Menu.Item>
                {() => (
                  <button
                    className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                    onClick={() => onClick('sendChatMsg')}
                  >
                    {participant?.metadata.lock_settings.lock_chat_send_message
                      ? t('left-panel.menus.items.unlock-send-chat-message')
                      : t('left-panel.menus.items.lock-send-chat-message')}
                  </button>
                )}
              </Menu.Item>
            </div>

            {roomFeatures.chat_features.allow_file_upload ? (
              <div className="" role="none">
                <Menu.Item>
                  {() => (
                    <button
                      className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
                      onClick={() => onClick('chatFile')}
                    >
                      {participant?.metadata.lock_settings.lock_chat_file_share
                        ? t('left-panel.menus.items.unlock-send-file')
                        : t('left-panel.menus.items.lock-send-file')}
                    </button>
                  )}
                </Menu.Item>
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
