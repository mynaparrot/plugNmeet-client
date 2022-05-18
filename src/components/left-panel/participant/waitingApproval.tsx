import React from 'react';
import { store, useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { useTranslation } from 'react-i18next';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';

interface IWaitingApprovalProps {
  userId: string;
  name: string;
  openRemoveParticipantAlert(userId: string, type: string): void;
}
const WaitingApproval = ({
  userId,
  name,
  openRemoveParticipantAlert,
}: IWaitingApprovalProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const { t } = useTranslation();

  const approve = async () => {
    const session = store.getState().session;
    const data = {
      room_id: session.currentRoom.room_id,
      user_id: userId,
    };

    const res = await sendAPIRequest('approveWaitingUser', data);
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

  const reject = () => {
    openRemoveParticipantAlert(userId, 'reject');
  };

  const render = () => {
    if (participant?.metadata.wait_for_approval) {
      return (
        <div>
          <button onClick={approve}>{t('left-panel.approve')}</button>
          <button onClick={reject}>{t('left-panel.reject')}</button>
        </div>
      );
    }

    return null;
  };

  return render();
};

export default WaitingApproval;
