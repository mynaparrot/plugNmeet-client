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
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';

interface IMicMenuItemProps {
  userId: string;
}
const MicMenuItem = ({ userId }: IMicMenuItemProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const session = store.getState().session;
  const [text, setText] = useState<string>('Ask to share Microphone');
  const [task, setTask] = useState<string>('');
  const { t } = useTranslation();

  useEffect(() => {
    if (participant?.audioTracks === 0) {
      setText(t('left-panel.menus.items.ask-to-share-microphone'));
      setTask('left-panel.menus.items.share-microphone');
    } else if (participant?.isMuted) {
      setText(t('left-panel.menus.items.ask-to-unmute-mic'));
      setTask('left-panel.menus.items.unmute-mic');
    } else if (participant?.audioTracks) {
      setText(t('left-panel.menus.items.mute-mic'));
      setTask('mute');
    }
  }, [t, participant?.isMuted, participant?.audioTracks]);

  const onClick = () => {
    if (task === 'mute') {
      muteAudio();
      return;
    }

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

  const muteAudio = async () => {
    const session = store.getState().session;

    const body = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      user_id: participant?.userId,
      muted: true,
    };
    const res = await sendAPIRequest('muteUnmuteTrack', body);

    if (res.status) {
      toast(
        t('left-panel.menus.notice.you-have-muted-to', {
          name: participant?.name,
        }),
        {
          toastId: 'asked-status',
          type: 'info',
        },
      );
    } else {
      toast(t(res.msg), {
        toastId: 'asked-status',
        type: 'error',
      });
    }
  };

  const render = () => {
    return (
      <div className="" role="none">
        <Menu.Item onClick={() => onClick()}>
          {() => (
            <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white">
              {text}
            </button>
          )}
        </Menu.Item>
      </div>
    );
  };
  return (
    <>{session.currenUser?.userId !== participant?.userId ? render() : null}</>
  );
};

export default MicMenuItem;
