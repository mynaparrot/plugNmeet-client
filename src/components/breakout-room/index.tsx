import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageBreakoutRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import FormElems from './form';
import ManageActiveRooms from './manage-active-rooms';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

const BreakoutRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const breakoutRoomIsActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures
        ?.isActive,
  );

  const closeModal = () => {
    dispatch(updateShowManageBreakoutRoomModal(false));
  };

  return (
    <Dialog
      open={true}
      as="div"
      className="relative z-10 focus:outline-hidden"
      onClose={closeModal}
    >
      <div className="breakoutRoomModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-5xl bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
          >
            <DialogTitle
              as="h3"
              className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950 mb-2"
            >
              <span>{t('breakout-room.modal-title')}</span>
              <button
                className="cursor-pointer"
                onClick={closeModal}
                aria-label="Close"
              >
                <PopupCloseSVGIcon classes="text-Gray-600" />
              </button>
            </DialogTitle>
            <hr />
            <div className="mt-4">
              {breakoutRoomIsActive ? <ManageActiveRooms /> : <FormElems />}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default BreakoutRoom;
