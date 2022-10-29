import React, { useEffect, useState } from 'react';
import { Menu } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { sendWebsocketMessage } from '../../../../../helpers/websocket';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../../../../../helpers/proto/plugnmeet_datamessage_pb';

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

  const onClick = () => {
    const dataMsg = new DataMessage({
      type: DataMsgType.SYSTEM,
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      to: userId,
      body: {
        type: DataMsgBodyType.INFO,
        from: {
          sid: session.currentUser?.sid ?? '',
          userId: session.currentUser?.userId ?? '',
        },
        msg:
          t('left-panel.menus.notice.asked-you-to', {
            name: session.currentUser?.name,
          }) + t(task),
      },
    });

    sendWebsocketMessage(dataMsg.toBinary());

    toast(
      t('left-panel.menus.notice.you-have-asked', {
        name: participant?.name,
      }) + t(task),
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
