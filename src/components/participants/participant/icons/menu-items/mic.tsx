import React, { useEffect, useState } from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  DataMsgBodyType,
  MuteUnMuteTrackReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { getNatsConn } from '../../../../../helpers/nats';

interface IMicMenuItemProps {
  userId: string;
}
const MicMenuItem = ({ userId }: IMicMenuItemProps) => {
  const audioTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioTracks,
  );
  const isMuted = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.isMuted,
  );
  const name = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.name,
  );
  const session = store.getState().session;
  const [text, setText] = useState<string>('Ask to share Microphone');
  const [task, setTask] = useState<string>('');
  const { t } = useTranslation();
  const conn = getNatsConn();

  useEffect(() => {
    if (!audioTracks) {
      setText(t('left-panel.menus.items.ask-to-share-microphone').toString());
      setTask('left-panel.menus.items.share-microphone');
    } else if (isMuted) {
      setText(t('left-panel.menus.items.ask-to-unmute-mic').toString());
      setTask('left-panel.menus.items.unmute-mic');
    } else if (audioTracks) {
      setText(t('left-panel.menus.items.mute-mic').toString());
      setTask('mute');
    }
  }, [t, isMuted, audioTracks]);

  const onClick = async () => {
    if (task === 'mute') {
      await muteAudio();
      return;
    }

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

  const muteAudio = async () => {
    const session = store.getState().session;

    const body = create(MuteUnMuteTrackReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: userId,
      muted: true,
    });
    const r = await sendAPIRequest(
      'muteUnmuteTrack',
      toBinary(MuteUnMuteTrackReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(
        t('left-panel.menus.notice.you-have-muted-to', {
          name: name,
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
  return <>{session.currentUser?.userId !== userId ? render() : null}</>;
};

export default MicMenuItem;
