import React, { useMemo } from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { getNatsConn } from '../../../../../helpers/nats';

interface IWebcamMenuItemProps {
  userId: string;
}
const WebcamMenuItem = ({ userId }: IWebcamMenuItemProps) => {
  const { t } = useTranslation();
  const name = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.name,
  );
  const videoTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.videoTracks,
  );

  const session = store.getState().session;
  const roomFeatures = session.currentRoom.metadata?.roomFeatures;
  const conn = getNatsConn();

  const { text, task } = useMemo(() => {
    if (!videoTracks) {
      return {
        text: t('left-panel.menus.items.ask-to-share-webcam'),
        task: 'left-panel.menus.items.share-webcam',
      };
    } else {
      return {
        text: t('left-panel.menus.items.ask-to-stop-webcam'),
        task: 'left-panel.menus.items.stop-webcam',
      };
    }
  }, [t, videoTracks]);

  const handleWebcamAction = async () => {
    conn.sendDataMessage(
      DataMsgBodyType.INFO,
      t('left-panel.menus.notice.asked-you-to', {
        name: session.currentUser?.name,
        task: t(task),
      }),
      userId,
    );

    toast(
      t('left-panel.menus.notice.you-have-asked', {
        name: name,
        task: t(task),
      }),
      {
        toastId: 'asked-status',
        type: 'info',
      },
    );
  };

  // Conditions to show this menu item
  const shouldShow =
    session.currentUser?.userId !== userId &&
    roomFeatures?.allowWebcams &&
    !roomFeatures.adminOnlyWebcams;

  if (!shouldShow) {
    return null;
  }

  return (
    <MenuItem>
      <button
        className="text-Gray-900 cursor-pointer group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs font-medium transition ease-in hover:bg-Blue2-500 hover:text-white"
        onClick={handleWebcamAction}
      >
        {text}
      </button>
    </MenuItem>
  );
};

export default WebcamMenuItem;
