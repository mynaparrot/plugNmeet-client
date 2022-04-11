import React from 'react';
import { Menu } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { ICurrentUserMetadata } from '../../../../../store/slices/interfaces/session';

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

    const data = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      user_id: participant?.userId,
      service,
      direction,
    };

    const res = await sendAPIRequest('updateLockSettings', data);
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
      <React.Fragment>
        <div className="" role="none">
          <Menu.Item onClick={() => onClick('mic')}>
            {() => (
              <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
                {participant?.metadata.lock_settings.lock_microphone
                  ? t('left-panel.menus.items.unlock-microphone')
                  : t('left-panel.menus.items.lock-microphone')}
              </button>
            )}
          </Menu.Item>
        </div>

        {roomFeatures?.allow_webcams && !roomFeatures?.admin_only_webcams ? (
          <div className="" role="none">
            <Menu.Item onClick={() => onClick('webcam')}>
              {() => (
                <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
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
            <Menu.Item onClick={() => onClick('screenShare')}>
              {() => (
                <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
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
            <Menu.Item onClick={() => onClick('whiteboard')}>
              {() => (
                <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
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
            <Menu.Item onClick={() => onClick('sharedNotepad')}>
              {() => (
                <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
                  {participant?.metadata.lock_settings.lock_shared_notepad
                    ? t('left-panel.menus.items.unlock-shared-notepad')
                    : t('left-panel.menus.items.lock-shared-notepad')}
                </button>
              )}
            </Menu.Item>
          </div>
        ) : null}

        {roomFeatures?.chat_features.allow_chat ? (
          <React.Fragment>
            <div className="" role="none">
              <Menu.Item onClick={() => onClick('chat')}>
                {() => (
                  <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
                    {participant?.metadata.lock_settings.lock_chat
                      ? t('left-panel.menus.items.unlock-chat')
                      : t('left-panel.menus.items.lock-chat')}
                  </button>
                )}
              </Menu.Item>
            </div>

            <div className="" role="none">
              <Menu.Item onClick={() => onClick('sendChatMsg')}>
                {() => (
                  <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
                    {participant?.metadata.lock_settings.lock_chat_send_message
                      ? t('left-panel.menus.items.unlock-send-chat-message')
                      : t('left-panel.menus.items.lock-send-chat-message')}
                  </button>
                )}
              </Menu.Item>
            </div>

            {roomFeatures.chat_features.allow_file_upload ? (
              <div className="" role="none">
                <Menu.Item onClick={() => onClick('chatFile')}>
                  {() => (
                    <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
                      {participant?.metadata.lock_settings.lock_chat_file_share
                        ? t('left-panel.menus.items.unlock-send-file')
                        : t('left-panel.menus.items.lock-send-file')}
                    </button>
                  )}
                </Menu.Item>
              </div>
            ) : null}
          </React.Fragment>
        ) : null}
      </React.Fragment>
    );
  };

  return <React.Fragment>{render()}</React.Fragment>;
};

export default LockSettingMenuItem;
