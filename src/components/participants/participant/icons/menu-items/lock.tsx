import React, { useCallback, useState } from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  UpdateUserLockSettingsReqSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { ICurrentUserMetadata } from '../../../../../store/slices/interfaces/session';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';

interface ILockSettingMenuItemProps {
  userId: string;
}

const serviceToLockSettingMap: Record<
  string,
  keyof NonNullable<ICurrentUserMetadata['lockSettings']>
> = {
  mic: 'lockMicrophone',
  webcam: 'lockWebcam',
  screenShare: 'lockScreenSharing',
  whiteboard: 'lockWhiteboard',
  sharedNotepad: 'lockSharedNotepad',
  chat: 'lockChat',
  sendChatMsg: 'lockChatSendMessage',
  chatFile: 'lockChatFileShare',
};

const LockSettingMenuItem = ({ userId }: ILockSettingMenuItemProps) => {
  const session = store.getState().session;
  const roomFeatures = session.currentRoom.metadata?.roomFeatures;
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const lockSettings = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata?.lockSettings,
  );

  const toggleLockSetting = useCallback(
    async (task: string) => {
      if (isBusy) {
        return;
      }
      setIsBusy(true);

      const settingKey = serviceToLockSettingMap[task];
      const isLocked = !!lockSettings?.[settingKey];
      const direction = isLocked ? 'unlock' : 'lock';

      const body = create(UpdateUserLockSettingsReqSchema, {
        roomSid: session.currentRoom.sid,
        roomId: session.currentRoom.roomId,
        userId: userId,
        service: task,
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
      setIsBusy(false);
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [isBusy, lockSettings],
  );

  const lockableFeatures = [
    {
      key: 'mic',
      isDisplayed: true,
      isLocked: lockSettings?.lockMicrophone,
      lockText: t('left-panel.menus.items.lock-microphone'),
      unlockText: t('left-panel.menus.items.unlock-microphone'),
    },
    {
      key: 'webcam',
      isDisplayed:
        roomFeatures?.allowWebcams && !roomFeatures?.adminOnlyWebcams,
      isLocked: lockSettings?.lockWebcam,
      lockText: t('left-panel.menus.items.lock-webcam'),
      unlockText: t('left-panel.menus.items.unlock-webcam'),
    },
    {
      key: 'screenShare',
      isDisplayed: roomFeatures?.allowScreenShare,
      isLocked: lockSettings?.lockScreenSharing,
      lockText: t('left-panel.menus.items.lock-screen-sharing'),
      unlockText: t('left-panel.menus.items.unlock-screen-sharing'),
    },
    {
      key: 'whiteboard',
      isDisplayed: roomFeatures?.whiteboardFeatures?.allowedWhiteboard,
      isLocked: lockSettings?.lockWhiteboard,
      lockText: t('left-panel.menus.items.lock-whiteboard'),
      unlockText: t('left-panel.menus.items.unlock-whiteboard'),
    },
    {
      key: 'sharedNotepad',
      isDisplayed: roomFeatures?.sharedNotePadFeatures?.allowedSharedNotePad,
      isLocked: lockSettings?.lockSharedNotepad,
      lockText: t('left-panel.menus.items.lock-shared-notepad'),
      unlockText: t('left-panel.menus.items.unlock-shared-notepad'),
    },
    {
      key: 'chat',
      isDisplayed: roomFeatures?.chatFeatures?.allowChat,
      isLocked: lockSettings?.lockChat,
      lockText: t('left-panel.menus.items.lock-chat'),
      unlockText: t('left-panel.menus.items.unlock-chat'),
    },
    {
      key: 'sendChatMsg',
      isDisplayed: roomFeatures?.chatFeatures?.allowChat,
      isLocked: lockSettings?.lockChatSendMessage,
      lockText: t('left-panel.menus.items.lock-send-chat-message'),
      unlockText: t('left-panel.menus.items.unlock-send-chat-message'),
    },
    {
      key: 'chatFile',
      isDisplayed:
        roomFeatures?.chatFeatures?.allowChat &&
        roomFeatures?.chatFeatures?.allowFileUpload,
      isLocked: lockSettings?.lockChatFileShare,
      lockText: t('left-panel.menus.items.lock-send-file'),
      unlockText: t('left-panel.menus.items.unlock-send-file'),
    },
  ];

  return (
    <>
      {lockableFeatures.map(
        (feature) =>
          feature.isDisplayed && (
            <div className="" role="none" key={feature.key}>
              <MenuItem>
                {() => (
                  <button
                    className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50"
                    onClick={() => toggleLockSetting(feature.key)}
                  >
                    {feature.isLocked ? feature.unlockText : feature.lockText}
                  </button>
                )}
              </MenuItem>
            </div>
          ),
      )}
    </>
  );
};

export default LockSettingMenuItem;
