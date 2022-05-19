import React from 'react';
import { useTranslation } from 'react-i18next';

import { IParticipant } from '../../store/slices/interfaces/participant';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';
import { store } from '../../store';

interface IParticipantsListProps {
  waitingParticipants: IParticipant[];
}

const ParticipantsList = ({ waitingParticipants }: IParticipantsListProps) => {
  const { t } = useTranslation();

  const acceptUser = async (userId: string) => {
    const data = {
      user_id: userId,
    };

    const res = await sendAPIRequest('waitingRoom/approveUsers', data);
    if (res.status) {
      toast(t('left-panel.menus.notice.user-approved', { name: name }), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
  };

  const rejectUser = async (userId: string, block: boolean) => {
    const session = store.getState().session;
    const data = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      user_id: userId,
      msg: t('notifications.you-have-reject'),
      block_user: block,
    };

    const res = await sendAPIRequest('removeParticipant', data);
    if (res.status) {
      toast(t('left-panel.menus.notice.participant-removed'), {
        toastId: 'user-remove-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
  };

  const renderWaitingParticipants = () => {
    return waitingParticipants.map((p) => {
      return (
        <div className="" key={p.userId}>
          <p>{p.name}</p>
          <button onClick={() => acceptUser(p.userId)}>
            {t('left-panel.approve')}
          </button>
          <button onClick={() => rejectUser(p.userId, false)}>
            {t('left-panel.reject')}
          </button>
          <button onClick={() => rejectUser(p.userId, true)}>
            {t('waiting-room.reject-and-block-user')}
          </button>
        </div>
      );
    });
  };

  return (
    <div className="m-10">
      <p>
        {t('waiting-room.list-waiting-participants', {
          count: waitingParticipants.length,
        })}
      </p>
      <div>{renderWaitingParticipants()}</div>
    </div>
  );
};

export default ParticipantsList;
