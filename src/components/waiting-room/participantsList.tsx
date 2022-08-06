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
        <div
          className="waiting-list-item mb-2 pb-2 border-b border-solid border-primaryColor w-full max-w-max"
          key={p.userId}
        >
          <p className="text-base text-black dark:text-darkText">{p.name}</p>
          <button
            onClick={() => acceptUser(p.userId)}
            className="text-xs text-white py-[1px] px-2 rounded-lg transition ease-in bg-primaryColor hover:bg-secondaryColor"
          >
            {t('left-panel.approve')}
          </button>
          <button
            onClick={() => rejectUser(p.userId, false)}
            className="text-xs text-white py-[1px] px-2 rounded-lg transition ease-in bg-red-600 hover:bg-red-800 ml-2"
          >
            {t('left-panel.reject')}
          </button>
          <button
            onClick={() => rejectUser(p.userId, true)}
            className="text-xs text-white py-[1px] px-2 rounded-lg transition ease-in bg-red-600 hover:bg-red-800 ml-2"
          >
            {t('waiting-room.reject-and-block-user')}
          </button>
        </div>
      );
    });
  };

  return (
    <div className="waiting-list-wrap">
      <p className="text-lg my-4 text-black dark:text-white font-bold">
        {t('waiting-room.list-waiting-participants', {
          count: waitingParticipants.length,
        })}
      </p>
      <div className="waiting-list scrollBar h-[130px] overflow-auto">
        <div className="waiting-list-inner">{renderWaitingParticipants()}</div>
      </div>
    </div>
  );
};

export default ParticipantsList;
