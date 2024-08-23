import React, { useEffect, useState } from 'react';
import { Menu } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { DataMsgBodyType } from '../../../../../helpers/proto/plugnmeet_datamessage_pb';
import { getNatsConn } from '../../../../../helpers/nats';

interface IWebcamMenuItemProps {
  userId: string;
}
const WebcamMenuItem = ({ userId }: IWebcamMenuItemProps) => {
  const { t } = useTranslation();
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const roomFeatures =
    store.getState().session.currentRoom.metadata?.room_features;
  const conn = getNatsConn();

  const session = store.getState().session;
  const [text, setText] = useState<string>('Ask to share Webcam');
  const [task, setTask] = useState<string>('');

  useEffect(() => {
    if (participant?.videoTracks === 0) {
      setText(t('left-panel.menus.items.ask-to-share-webcam').toString());
      setTask('left-panel.menus.items.share-webcam');
    } else {
      setText(t('left-panel.menus.items.ask-to-stop-webcam').toString());
      setTask('left-panel.menus.items.stop-webcam');
    }
  }, [t, participant?.videoTracks]);

  const onClick = async () => {
    await conn.sendDataMessage(
      DataMsgBodyType.INFO,
      t('left-panel.menus.notice.asked-you-to', {
        name: session.currentUser?.name,
        task: t(task),
      }),
    );

    toast(
      t('left-panel.menus.notice.you-have-asked', {
        name: participant?.name,
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
        <Menu.Item>
          {() => (
            <button
              className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
              onClick={() => onClick()}
            >
              {text}
            </button>
          )}
        </Menu.Item>
      </div>
    );
  };
  return (
    <>
      {session.currentUser?.userId !== participant?.userId &&
      roomFeatures?.allow_webcams &&
      !roomFeatures.admin_only_webcams
        ? render()
        : null}
    </>
  );
};

export default WebcamMenuItem;
