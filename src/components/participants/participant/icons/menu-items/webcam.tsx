import React, { useEffect, useState } from 'react';
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
  const roomFeatures =
    store.getState().session.currentRoom.metadata?.roomFeatures;
  const conn = getNatsConn();

  const session = store.getState().session;
  const [text, setText] = useState<string>('Ask to share Webcam');
  const [task, setTask] = useState<string>('');

  useEffect(() => {
    if (!videoTracks) {
      setText(t('left-panel.menus.items.ask-to-share-webcam').toString());
      setTask('left-panel.menus.items.share-webcam');
    } else {
      setText(t('left-panel.menus.items.ask-to-stop-webcam').toString());
      setTask('left-panel.menus.items.stop-webcam');
    }
  }, [t, videoTracks]);

  const onClick = async () => {
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

  const render = () => {
    return (
      <div className="" role="none">
        <MenuItem>
          {() => (
            <button
              className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
              onClick={() => onClick()}
            >
              {text}
            </button>
          )}
        </MenuItem>
      </div>
    );
  };
  return (
    <>
      {session.currentUser?.userId !== userId &&
      roomFeatures?.allowWebcams &&
      !roomFeatures.adminOnlyWebcams
        ? render()
        : null}
    </>
  );
};

export default WebcamMenuItem;
