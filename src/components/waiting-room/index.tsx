import React, { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogPanel, Button } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageWaitingRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import UpdateRoomMessage from './updateRoomMessage';
import BulkAction from './bulkAction';
import ParticipantsList from './participantsList';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

const ManageWaitingRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allParticipants = useAppSelector(participantsSelector.selectAll);
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const waitingParticipants = useMemo(() => {
    return allParticipants.filter((p) => p.metadata.waitForApproval);
  }, [allParticipants]);

  const closeModal = () => {
    setIsOpen(false);
    dispatch(updateShowManageWaitingRoomModal(false));
  };

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-10 focus:outline-hidden"
      onClose={() => false}
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
              <Button className="cursor-pointer" onClick={() => closeModal()}>
                <PopupCloseSVGIcon classes="text-Gray-600" />
              </Button>
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
