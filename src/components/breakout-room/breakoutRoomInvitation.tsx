import React, { Fragment, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { toast } from 'react-toastify';
import { JoinBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateReceivedInvitationFor } from '../../store/slices/breakoutRoomSlice';
import { useJoinRoomMutation } from '../../store/services/breakoutRoomApi';
import { getMediaServerConnRoom } from '../../helpers/livekit/utils';
import { buildAccessTokenUrl } from './utils/breakoutRoom';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

const BreakoutRoomInvitation = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();

  const receivedInvitationFor = useAppSelector(
    (state) => state.breakoutRoom.receivedInvitationFor,
  );
  const [joinRoom, { isLoading, isSuccess, isError, data, error }] =
    useJoinRoomMutation();

  useEffect(() => {
    if (isSuccess && data?.status && data.token) {
      // Redirect the current tab to the breakout room. window.location.replace
      // tears down the current room connection and ensures browser-back exits
      // the session instead of landing on a stale token.
      window.location.replace(buildAccessTokenUrl(data.token));
      return;
    } else if ((isSuccess && !data?.status) || isError) {
      const msg = data?.msg ?? (error as any)?.data?.msg ?? 'Error';
      toast(t(msg), { type: 'error' });
    }
  }, [isSuccess, isError, data, error, t]);

  const closeModal = () => {
    dispatch(updateReceivedInvitationFor(''));
  };

  const join = () => {
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: receivedInvitationFor,
        userId: currentRoom.localParticipant.identity,
      }),
    );
  };

  if (receivedInvitationFor === '') {
    return null;
  }

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog
        as="div"
        className="breakoutRoomModalInvite fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70 dark:bg-Gray-950/80"
        onClose={closeModal}
      >
        <div className="min-h-full flex p-4 items-end justify-end">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-max h-full bg-white dark:bg-dark-primary border border-Gray-200 dark:border-Gray-800 shadow-virtualPOP p-4 rounded-xl overflow-hidden duration-300 ease-out">
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-base font-semibold leading-7 text-Gray-950 dark:text-white mb-2 border-b border-Gray-300 dark:border-Gray-800 pb-2"
              >
                <span>{t('breakout-room.invitation-title')}</span>
                <Button className="cursor-pointer" onClick={closeModal}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div className="mt-2">
                <span className="text-black dark:text-white text-sm">
                  {t('breakout-room.invitation-msg')}
                </span>

                <div className="button-section flex items-center justify-start mt-4">
                  <button
                    className="primary-button h-7 ms-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={join}
                    disabled={isLoading}
                  >
                    {t('breakout-room.join')}
                  </button>
                </div>
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default React.memo(BreakoutRoomInvitation);
