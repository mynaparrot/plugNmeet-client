import React, { useCallback, useMemo, useState } from 'react';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  UpdateUserLockSettingsReqSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowLockSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import Modal from '../../../helpers/ui/modal';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';

const LockSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const { roomSid, roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  const roomLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );

  const updateLockSettings = useCallback(
    async (status: boolean, service: string) => {
      if (isBusy) {
        return;
      }
      setIsBusy(true);

      const direction = status ? 'lock' : 'unlock';
      const body = create(UpdateUserLockSettingsReqSchema, {
        roomSid,
        roomId,
        userId: 'all',
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
        dispatch(
          addUserNotification({
            message: t('footer.notice.applied-settings'),
            typeOption: 'info',
          }),
        );
      } else {
        dispatch(
          addUserNotification({
            message: res.msg,
            typeOption: 'error',
          }),
        );
      }

      setIsBusy(false);
    },
    // oxlint-disable-next-line exhaustive-deps
    [isBusy, t, dispatch],
  );

  const closeModal = () => {
    dispatch(updateShowLockSettingsModal(false));
  };

  const lockOptions = [
    {
      label: t('footer.modal.lock-microphone'),
      checked: roomLockSettings?.lockMicrophone ?? false,
      service: 'mic',
    },
    {
      label: t('footer.modal.lock-webcams'),
      checked: roomLockSettings?.lockWebcam ?? false,
      service: 'webcam',
    },
    {
      label: t('footer.modal.lock-screen-sharing'),
      checked: roomLockSettings?.lockScreenSharing ?? false,
      service: 'screenShare',
    },
    {
      label: t('footer.modal.lock-whiteboard'),
      checked: roomLockSettings?.lockWhiteboard ?? false,
      service: 'whiteboard',
    },
    {
      label: t('footer.modal.lock-shared-notepad'),
      checked: roomLockSettings?.lockSharedNotepad ?? false,
      service: 'sharedNotepad',
    },
    {
      label: t('footer.modal.lock-chat'),
      checked: roomLockSettings?.lockChat ?? false,
      service: 'chat',
    },
    {
      label: t('footer.modal.lock-send-message'),
      checked: roomLockSettings?.lockChatSendMessage ?? false,
      service: 'sendChatMsg',
    },
    {
      label: t('footer.modal.lock-chat-file-share'),
      checked: roomLockSettings?.lockChatFileShare ?? false,
      service: 'chatFile',
    },
    {
      label: t('footer.modal.lock-private-chat'),
      checked: roomLockSettings?.lockPrivateChat ?? false,
      service: 'privateChat',
    },
  ];

  return (
    <Modal
      show={true}
      onClose={closeModal}
      title={t('footer.modal.lock-settings-title')}
    >
      {lockOptions.map((option, i) => (
        <SettingsSwitch
          key={option.service}
          label={option.label}
          enabled={option.checked}
          onChange={(e) => updateLockSettings(e, option.service)}
          disabled={isBusy}
          customCss={`${i > 0 ? 'mt-4' : ''}`}
        />
      ))}
    </Modal>
  );
};

export default LockSettingsModal;
