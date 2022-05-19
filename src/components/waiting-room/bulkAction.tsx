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
    <div className="m-10">
      <button onClick={approveEveryone}>{t('waiting-room.accept-all')}</button>
      <button onClick={rejectEveryone}>{t('waiting-room.reject-all')}</button>
    </div>
  );
};

export default BulkAction;
