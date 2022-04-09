import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import MicMenuItem from './menu-items/mic';
import WebcamMenuItem from './menu-items/webcam';
import LowerHandMenuItem from './menu-items/lowerHand';
import LockSettingMenuItem from './menu-items/lock';
import RemoveUserMenuItem from './menu-items/removeUser';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { store } from '../../../../store';
import { toast } from 'react-toastify';

interface IMenuIconProps {
  userId: string;
  name: string;
}

const MenuIcon = ({ userId, name }: IMenuIconProps) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const { t } = useTranslation();

  const onOpenRemoveParticipantAlert = (user_id) => {
    if (user_id === userId) {
      setShowModal(true);
    }
  };

  const onCloseRemoveParticipantAlert = async (remove = false) => {
    setShowModal(false);
    if (!remove) {
      return;
    }

    const session = store.getState().session;
    const data = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      user_id: userId,
    };

    const res = await sendAPIRequest('removeParticipant', data);
    if (res.status) {
      toast(t('left-panel.menus.notice.participant-removed'), {
        toastId: 'user-remove-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
  };

  const removeParticipantAlertModal = () => {
    return (
      <Transition
        show={showModal}
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Dialog
          open={showModal}
          onClose={() => onCloseRemoveParticipantAlert()}
          className="remove-participants-popup fixed z-[99999] inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="popup-inner bg-white w-full max-w-sm rounded-3xl shadow-header relative px-4 lg:px-6 py-12 lg:py-14">
              <button
                className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                type="button"
                onClick={() => onCloseRemoveParticipantAlert()}
              >
                <span className="inline-block h-[1px] w-[20px] bg-brandColor1 absolute top-0 left-0 rotate-45" />
                <span className="inline-block h-[1px] w-[20px] bg-brandColor1 absolute top-0 left-0 -rotate-45" />
              </button>
              <Dialog.Title className="mb-4 md:mb-6 text-sm">
                {t('left-panel.menus.notice.confirm', {
                  name,
                })}
              </Dialog.Title>

              <button
                className="inline-flex justify-center px-4 py-2 text-xs md:text-sm font-medium text-white bg-red-600 mr-4 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                onClick={() => onCloseRemoveParticipantAlert(true)}
              >
                {t('left-panel.menus.notice.remove')}
              </button>

              <button
                className="inline-flex justify-center px-4 py-2 text-xs md:text-sm font-medium bg-brandColor1 hover:bg-brandColor2 text-white border border-transparent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                onClick={() => onCloseRemoveParticipantAlert(false)}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };

  const render = () => {
    return (
      <React.Fragment>
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button className="relative flex-shrink-0 mt-2">
                <i className="pnm-menu-small brand-color1 opacity-50" />
              </Menu.Button>

              {/* Use the Transition component. */}
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                {/* Mark this component as `static` */}
                <Menu.Items
                  static
                  className="origin-top-right z-10 absolute right-0 mt-2 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                >
                  <MicMenuItem userId={userId} />
                  <WebcamMenuItem userId={userId} />
                  <LowerHandMenuItem userId={userId} />
                  <LockSettingMenuItem userId={userId} />
                  <RemoveUserMenuItem
                    onOpenAlert={onOpenRemoveParticipantAlert}
                    userId={userId}
                  />
                </Menu.Items>
              </Transition>
            </>
          )}
        </Menu>
        {removeParticipantAlertModal()}
      </React.Fragment>
    );
  };

  return <React.Fragment>{render()}</React.Fragment>;
};

export default MenuIcon;
