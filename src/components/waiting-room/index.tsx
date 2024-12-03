import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogPanel, Button } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageWaitingRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import { IParticipant } from '../../store/slices/interfaces/participant';
import UpdateRoomMessage from './updateRoomMessage';
import BulkAction from './bulkAction';
import ParticipantsList from './participantsList';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

const ManageWaitingRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const totalParticipants = useAppSelector(participantsSelector.selectTotal);

  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [waitingParticipants, setWaitingParticipants] =
    useState<IParticipant[]>();

  useEffect(() => {
    const participants = participantsSelector.selectAll(store.getState());

    if (participants.length) {
      const waiting = participants.filter((p) => p.metadata.waitForApproval);
      setWaitingParticipants(waiting);
    }
  }, [totalParticipants]);

  const closeModal = () => {
    setIsOpen(false);
    dispatch(updateShowManageWaitingRoomModal(false));
  };

  return (
    <>
      <Dialog
        open={isOpen}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={() => false}
      >
        <div className="showManageWaitingRoomModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950"
              >
                <span>{t('waiting-room.modal-title')}</span>
                <Button onClick={() => closeModal()}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div className="mt-8">
                <UpdateRoomMessage />
                <BulkAction waitingParticipants={waitingParticipants ?? []} />
                <ParticipantsList
                  waitingParticipants={waitingParticipants ?? []}
                />
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default ManageWaitingRoom;
