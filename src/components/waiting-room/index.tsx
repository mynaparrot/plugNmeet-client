import React from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageWaitingRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import Modal from '../../helpers/ui/modal';
import UpdateRoomMessage from './updateRoomMessage';
import BulkAction from './bulkAction';
import ParticipantsList from './participantsList';

const selectWaitingParticipants = createSelector(
  [participantsSelector.selectAll],
  (participants) => participants.filter((p) => p.metadata.waitForApproval),
);

const ManageWaitingRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const waitingParticipants = useAppSelector(selectWaitingParticipants);

  const closeModal = () => {
    dispatch(updateShowManageWaitingRoomModal(false));
  };

  return (
    <Modal
      show={true}
      onClose={closeModal}
      title={t('waiting-room.modal-title')}
      customClass="showManageWaitingRoomModal overflow-hidden"
      maxWidth="max-w-xl"
    >
      {waitingParticipants.length ? (
        <>
          <UpdateRoomMessage />
          <ParticipantsList waitingParticipants={waitingParticipants} />
          <BulkAction waitingParticipants={waitingParticipants} />
        </>
      ) : (
        <p>{t('waiting-room.no-pending-user')}</p>
      )}
    </Modal>
  );
};

export default ManageWaitingRoom;
