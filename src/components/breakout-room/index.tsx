import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogPanel, Button } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../store';
import { updateShowManageBreakoutRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import FromElems from './form';
import BreakoutRoomLists from './list';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

const BreakoutRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const breakoutRoomIsActive =
    store.getState().session.currentRoom.metadata?.roomFeatures
      ?.breakoutRoomFeatures?.isActive;
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const closeModal = () => {
    setIsOpen(false);
    dispatch(updateShowManageBreakoutRoomModal(false));
  };

  return (
    <>
      <Dialog
        open={isOpen}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={() => false}
      >
        <div className="breakoutRoomModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-5xl bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950"
              >
                <span>{t('breakout-room.modal-title')}</span>
                <Button onClick={() => closeModal()}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div className="mt-8">
                {breakoutRoomIsActive ? <BreakoutRoomLists /> : <FromElems />}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default BreakoutRoom;
