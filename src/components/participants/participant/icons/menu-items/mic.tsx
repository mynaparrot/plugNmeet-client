import React, { useMemo } from 'react';
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
  const { t } = useTranslation();
  const conn = getNatsConn();

  const { text, task } = useMemo(() => {
    if (!audioTracks) {
      return {
        text: t('left-panel.menus.items.ask-to-share-microphone'),
        task: 'left-panel.menus.items.share-microphone',
      };
    } else if (isMuted) {
      return {
        text: t('left-panel.menus.items.ask-to-unmute-mic'),
        task: 'left-panel.menus.items.unmute-mic',
      };
    }
    // if audioTracks > 0 and not muted
    return { text: t('left-panel.menus.items.mute-mic'), task: 'mute' };
  }, [audioTracks, isMuted, t]);

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

  const handleMicAction = async () => {
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

  // This menu item is for controlling other users, not oneself.
  if (session.currentUser?.userId === userId) {
    return null;
  }

  return (
    <MenuItem>
      <button
        className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50"
        onClick={handleMicAction}
      >
        {text}
      </button>
    </MenuItem>
  );
};

export default MicMenuItem;
