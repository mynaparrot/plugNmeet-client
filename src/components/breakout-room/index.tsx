import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../store';
import { updateShowManageBreakoutRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import FromElems from './form';
import BreakoutRoomLists from './list';

const BreakoutRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const breakoutRoomIsActive =
    store.getState().session.currentRoom.metadata?.room_features
      .breakout_room_features.is_active;
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const closeModal = () => {
    setIsOpen(false);
    dispatch(updateShowManageBreakoutRoomModal(false));
  };

  const renderModal = () => {
    return (
      <>
        <Transition appear show={isOpen} as={Fragment}>
          <Dialog
            as="div"
            className="breakout-room-modal fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
            static={false}
          >
            <div className="min-h-screen px-4 text-center flex items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full max-w-5xl h-full p-4 md:p-6 my-16 overflow-hidden text-left transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 ltr:right-6 rtl:left-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white ltr:text-left rtl:text-right mb-2"
                  >
                    {t('breakout-room.modal-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-2">
                    {breakoutRoomIsActive ? (
                      <BreakoutRoomLists />
                    ) : (
                      <FromElems />
                    )}
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return renderModal();
};

export default BreakoutRoom;
