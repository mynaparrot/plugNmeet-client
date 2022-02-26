import React, { useEffect, useState } from 'react';
import { Menu } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
} from '../../../../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from '../../../../../helpers/websocketConnector';

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
      setText(t('left-panel.menus.items.ask-to-share-webcam'));
      setTask('left-panel.menus.items.share-webcam');
    } else {
      setText(t('left-panel.menus.items.ask-to-stop-webcam'));
      setTask('left-panel.menus.items.stop-webcam');
    }
  }, [t, participant?.videoTracks]);

  const onClick = () => {
    const msg: IDataMessage = {
      type: DataMessageType.SYSTEM,
      room_sid: session.currentRoom.sid,
      message_id: '',
      to: participant?.sid,
      body: {
        type: SystemMsgType.INFO,
        from: {
          sid: session.currenUser?.sid ?? '',
          userId: session.currenUser?.userId ?? '',
        },
        msg:
          t('left-panel.menus.notice.asked-you-to', {
            name: session.currenUser?.name,
          }) + t(task),
      },
    };

    sendWebsocketMessage(JSON.stringify(msg));

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
        <Menu.Item onClick={() => onClick()}>
          {() => (
            <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-brandColor1 hover:text-white">
              {text}
            </button>
          )}
        </Menu.Item>
      </div>
    );
  };
  return (
    <React.Fragment>
      {session.currenUser?.userId !== participant?.userId &&
      roomFeatures?.allow_webcams &&
      !roomFeatures.admin_only_webcams
        ? render()
        : null}
    </React.Fragment>
  );
};

export default WebcamMenuItem;
