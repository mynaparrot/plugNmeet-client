import React from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageWaitingRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import UpdateRoomMessage from './updateRoomMessage';
import BulkAction from './bulkAction';
import ParticipantsList from './participantsList';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

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
    <Dialog
      open={true}
      as="div"
      className="relative z-10 focus:outline-hidden"
      onClose={closeModal}
    >
      <div className="showManageWaitingRoomModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-xl bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out"
          >
            <DialogTitle
              as="h3"
              className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
            >
              <span>{t('waiting-room.modal-title')}</span>
              <button className="cursor-pointer" onClick={closeModal}>
                <PopupCloseSVGIcon classes="text-Gray-600" />
              </button>
            </DialogTitle>
            <hr />
            <div className="mt-4">
              {waitingParticipants.length ? (
                <>
                  <UpdateRoomMessage />
                  <ParticipantsList waitingParticipants={waitingParticipants} />
                  <BulkAction waitingParticipants={waitingParticipants} />
                </>
              ) : (
                <p>{t('waiting-room.no-pending-user')}</p>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default ManageWaitingRoom;
