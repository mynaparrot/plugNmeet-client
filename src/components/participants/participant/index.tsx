import React, { useState } from 'react';
import { RemoteParticipant } from 'livekit-client';
import { toast } from 'react-toastify';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { IParticipant } from '../../../store/slices/interfaces/participant';
import Avatar from './avatar';
import ParticipantName from './name';
import RaiseHandIcon from './icons/raiseHand';
import MicIcon from './icons/mic';
import WebcamIcon from './icons/webcam';
import MenuIcon from './icons/menu';
import { store } from '../../../store';
import VisibilityIcon from './icons/visibility';
import PresenterIcon from './icons/presenterIcon';
import WaitingApproval from './waitingApproval';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

interface IParticipantComponentProps {
  participant: IParticipant;
  remoteParticipant?: RemoteParticipant;
}

const ParticipantComponent = ({
  participant,
  remoteParticipant,
}: IParticipantComponentProps) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [blockUser, setBlockUser] = useState<number>(0);
  const [removeType, setRemoveType] = useState<string>('remove');
  const currentUser = store.getState().session.currentUser;
  const { t } = useTranslation();

  const onOpenRemoveParticipantAlert = (user_id: string, type: string) => {
    if (user_id === participant.userId) {
      setRemoveType(type);
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
      user_id: participant.userId,
      msg:
        removeType === 'remove'
          ? t('notifications.you-have-removed')
          : t('notifications.you-have-reject'),
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

  return (
    <>
      <li className="mb-3 w-full list-none">
        <div className="flex items-center justify-between relative">
          <div className="left flex items-center ">
            <Avatar participant={participant} />
            <ParticipantName
              name={participant.name}
              isCurrentUser={currentUser?.userId === participant.userId}
            />
          </div>
          <div className="right ml-2 flex-auto flex items-center justify-end">
            <RaiseHandIcon userId={participant.userId} />
            <VisibilityIcon userId={participant.userId} />
            <PresenterIcon userId={participant.userId} />
            <WebcamIcon userId={participant.userId} />
            <MicIcon
              userId={participant.userId}
              remoteParticipant={remoteParticipant}
            />
            {currentUser?.userId !== participant.userId ? (
              <MenuIcon
                userId={participant.userId}
                name={participant.name}
                isAdmin={participant.metadata.is_admin}
                openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
              />
            ) : null}
          </div>
          {currentUser?.metadata?.is_admin ? (
            <div className="approve-wrap absolute right-0 top-5">
              <WaitingApproval
                userId={participant.userId}
                name={participant.name}
                openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
              />
            </div>
          ) : null}
        </div>
      </li>
      {removeParticipantAlertModal()}
    </>
  );
};

export default ParticipantComponent;
