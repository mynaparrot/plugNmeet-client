import React, { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Dialog } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import MicMenuItem from './menu-items/mic';
import WebcamMenuItem from './menu-items/webcam';
import SwitchPresenterMenuItem from './menu-items/switchPresenter';
import LowerHandMenuItem from './menu-items/lowerHand';
import LockSettingMenuItem from './menu-items/lock';
import RemoveUserMenuItem from './menu-items/removeUser';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';
import { store } from '../../../../store';

interface IMenuIconProps {
  userId: string;
  name: string;
}

const MenuIcon = ({ userId, name }: IMenuIconProps) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [blockUser, setBlockUser] = useState<number>(0);
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
      msg: t('notifications.you-have-removed'),
      block_user: blockUser === 1,
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
                <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 rotate-45" />
                <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 -rotate-45" />
              </button>
              <Dialog.Title className="mb-4 md:mb-6 text-sm">
                <legend className="text-base font-medium text-gray-900">
                  {t('left-panel.menus.notice.confirm', {
                    name,
                  })}
                </legend>
              </Dialog.Title>

              <div className="mb-10 pl-3">
                <p className="text-sm text-gray-500">
                  {t('left-panel.menus.notice.want-to-block')}
                </p>
                <div className="mt-4 pl-2 space-y-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      value="1"
                      name="block"
                      id="yes"
                      checked={blockUser === 1}
                      onChange={(e) =>
                        setBlockUser(Number(e.currentTarget.value))
                      }
                    />
                    <label
                      htmlFor="yes"
                      className="ml-3 block text-sm font-medium text-gray-700"
                    >
                      {t('yes')}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      value="0"
                      name="block"
                      id="no"
                      checked={blockUser === 0}
                      onChange={(e) =>
                        setBlockUser(Number(e.currentTarget.value))
                      }
                    />
                    <label
                      htmlFor="no"
                      className="ml-3 block text-sm font-medium text-gray-700"
                    >
                      {t('no')}
                    </label>
                  </div>
                </div>
              </div>

              <button
                className="inline-flex justify-center px-4 py-2 text-xs md:text-sm font-medium text-white bg-red-600 mr-4 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                onClick={() => onCloseRemoveParticipantAlert(true)}
              >
                {t('left-panel.menus.notice.remove')}
              </button>

              <button
                className="inline-flex justify-center px-4 py-2 text-xs md:text-sm font-medium bg-primaryColor hover:bg-secondaryColor text-white border border-transparent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
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
      <>
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button className="relative flex-shrink-0 mt-2">
                <i className="pnm-menu-small primaryColor opacity-50" />
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
                  <SwitchPresenterMenuItem userId={userId} />
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
      </>
    );
  };

  return <>{render()}</>;
};

export default MenuIcon;
