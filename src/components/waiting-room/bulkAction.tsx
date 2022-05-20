import React from 'react';
import { useTranslation } from 'react-i18next';

import { IParticipant } from '../../store/slices/interfaces/participant';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';
import { store } from '../../store';

interface IBulkActionProps {
  waitingParticipants: IParticipant[];
}

const BulkAction = ({ waitingParticipants }: IBulkActionProps) => {
  const { t } = useTranslation();

  const approveEveryone = () => {
    waitingParticipants.forEach(async (p) => {
      const data = {
        user_id: p.userId,
      };

      const res = await sendAPIRequest('waitingRoom/approveUsers', data);
      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    });
  };

  const rejectEveryone = () => {
    const session = store.getState().session;
    const data: any = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
    };
    waitingParticipants.forEach(async (p) => {
      data.user_id = p.userId;
      data.msg = t('notifications.you-have-reject');
      data.block_user = false;

      const res = await sendAPIRequest('removeParticipant', data);
      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    });
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-start">
      <button
        onClick={approveEveryone}
        className="py-1 px-6 mr-4 rounded-xl text-white text-sm block transition ease-in bg-primaryColor hover:bg-secondaryColor"
      >
        {t('waiting-room.accept-all')}
      </button>
      <button
        onClick={rejectEveryone}
        className="py-1 px-6 rounded-xl text-white text-sm block transition ease-in bg-primaryColor hover:bg-secondaryColor"
      >
        {t('waiting-room.reject-all')}
      </button>
    </div>
  );
};

export default BulkAction;
