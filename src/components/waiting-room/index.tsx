import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageWaitingRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import { selectWaitingParticipants } from '../../store/slices/participantSlice';
import Modal from '../../helpers/ui/modal';
import UpdateRoomMessage from './updateRoomMessage';
import BulkAction from './bulkAction';
import ParticipantsList from './participantsList';

const ManageWaitingRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const waitingParticipants = useAppSelector(selectWaitingParticipants);

  const closeModal = useCallback(() => {
    dispatch(updateShowManageWaitingRoomModal(false));
  }, [dispatch]);

  return (
    <Modal
      show={true}
      onClose={closeModal}
      title={t('waiting-room.modal-title')}
      customClass="showManageWaitingRoomModal overflow-hidden"
      maxWidth="max-w-xl"
    >
      <UpdateRoomMessage />

      {waitingParticipants.length ? (
        <>
          <ParticipantsList waitingParticipants={waitingParticipants} />
          <BulkAction waitingParticipants={waitingParticipants} />
        </>
      ) : (
        <div className="mt-6 p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {t('waiting-room.no-pending-user')}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default ManageWaitingRoom;
