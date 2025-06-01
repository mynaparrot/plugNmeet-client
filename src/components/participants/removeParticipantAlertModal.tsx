import React, { useState } from 'react';
import { Dialog, DialogTitle, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RemoveParticipantReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';

export interface IRemoveParticipantAlertModalData {
  name: string;
  userId: string;
  removeType: string;
}

interface IRemoveParticipantAlertModalProps {
  name: string;
  userId: string;
  removeType: string;
  closeAlertModal: () => void;
}

const RemoveParticipantAlertModal = ({
  name,
  userId,
  removeType,
  closeAlertModal,
}: IRemoveParticipantAlertModalProps) => {
  const { t } = useTranslation();
  const [blockUser, setBlockUser] = useState<number>(0);

  const onCloseRemoveParticipantAlert = async (remove = false) => {
    if (!remove) {
      closeAlertModal();
      return;
    }

    const session = store.getState().session;
    const body = create(RemoveParticipantReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: userId,
      msg:
        removeType === 'remove'
          ? t('notifications.you-have-removed').toString()
          : t('notifications.you-have-reject').toString(),
      blockUser: blockUser === 1,
    });

    const r = await sendAPIRequest(
      'removeParticipant',
      toBinary(RemoveParticipantReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

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
    closeAlertModal();
  };

  return (
    <Transition
      show={true}
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      <Dialog
        open={true}
        onClose={() => onCloseRemoveParticipantAlert()}
        className="remove-participants-popup fixed z-99999 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black opacity-30" />

          <div className="popup-inner bg-white dark:bg-dark-primary w-full max-w-sm rounded-3xl shadow-header relative px-4 lg:px-6 py-12 lg:py-14">
            <button
              className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-hidden"
              type="button"
              onClick={() => onCloseRemoveParticipantAlert()}
            >
              <span className="inline-block h-px w-[20px] bg-primary-color dark:bg-dark-text absolute top-0 left-0 rotate-45" />
              <span className="inline-block h-px w-[20px] bg-primary-color dark:bg-dark-text absolute top-0 left-0 -rotate-45" />
            </button>
            <DialogTitle className="mb-4 md:mb-6 text-sm">
              <legend className="text-base font-medium text-gray-900 dark:text-white">
                {t('left-panel.menus.notice.confirm', {
                  name,
                })}
              </legend>
            </DialogTitle>

            <div className="mb-10 pl-3">
              <p className="text-sm text-gray-500 dark:text-dark-text">
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
                    className="ml-3 block text-sm font-medium text-gray-700 dark:text-dark-text"
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
                    className="ml-3 block text-sm font-medium text-gray-700 dark:text-dark-text"
                  >
                    {t('no')}
                  </label>
                </div>
              </div>
            </div>

            <button
              className="inline-flex justify-center px-4 py-2 text-xs md:text-sm font-medium text-white bg-red-600 mr-4 border border-transparent rounded-md hover:bg-red-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              onClick={() => onCloseRemoveParticipantAlert(true)}
            >
              {t('left-panel.menus.notice.remove')}
            </button>

            <button
              className="inline-flex justify-center px-4 py-2 text-xs md:text-sm font-medium bg-primary-color hover:bg-secondary-color text-white border border-transparent rounded-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
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

export default RemoveParticipantAlertModal;
