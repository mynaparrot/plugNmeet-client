import React, { Fragment } from 'react';
import {
  Dialog,
  DialogTitle,
  Switch,
  Field,
  Transition,
  TransitionChild,
  Label,
} from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  UpdateUserLockSettingsReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowLockSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const LockSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const roomLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );
  const session = store.getState().session;

  const updateLockSettings = async (status, service: string) => {
    const direction = status ? 'lock' : 'unlock';

    const body = create(UpdateUserLockSettingsReqSchema, {
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: 'all',
      service,
      direction,
    });

    const r = await sendAPIRequest(
      'updateLockSettings',
      toBinary(UpdateUserLockSettingsReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(t('footer.notice.applied-settings'), {
        toastId: 'lock-setting-status',
        type: 'info',
      });
    } else {
      toast(res.msg, {
        type: 'error',
      });
    }
  };

  const closeModal = () => {
    dispatch(updateShowLockSettingsModal(false));
  };

  const showLockItems = () => {
    return (
      <Field>
        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-microphone')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockMicrophone ?? false}
            onChange={(e) => updateLockSettings(e, 'mic')}
            className={`${
              roomLockSettings?.lockMicrophone
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockMicrophone
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-webcams')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockWebcam ?? false}
            onChange={(e) => updateLockSettings(e, 'webcam')}
            className={`${
              roomLockSettings?.lockWebcam
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockWebcam
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-screen-sharing')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockScreenSharing ?? false}
            onChange={(e) => updateLockSettings(e, 'screenShare')}
            className={`${
              roomLockSettings?.lockScreenSharing
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockScreenSharing
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-whiteboard')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockWhiteboard ?? false}
            onChange={(e) => updateLockSettings(e, 'whiteboard')}
            className={`${
              roomLockSettings?.lockWhiteboard
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockWhiteboard
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-shared-notepad')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockSharedNotepad ?? false}
            onChange={(e) => updateLockSettings(e, 'sharedNotepad')}
            className={`${
              roomLockSettings?.lockSharedNotepad
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockSharedNotepad
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-chat')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockChat ?? false}
            onChange={(e) => updateLockSettings(e, 'chat')}
            className={`${
              roomLockSettings?.lockChat
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockChat
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-send-message')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockChatSendMessage ?? false}
            onChange={(e) => updateLockSettings(e, 'sendChatMsg')}
            className={`${
              roomLockSettings?.lockChatSendMessage
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockChatSendMessage
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-chat-file-share')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockChatFileShare ?? false}
            onChange={(e) => updateLockSettings(e, 'chatFile')}
            className={`${
              roomLockSettings?.lockChatFileShare
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockChatFileShare
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-private-chat')}
          </Label>
          <Switch
            checked={roomLockSettings?.lockPrivateChat ?? false}
            onChange={(e) => updateLockSettings(e, 'privateChat')}
            className={`${
              roomLockSettings?.lockPrivateChat
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lockPrivateChat
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Field>
    );
  };

  const render = () => {
    return (
      <>
        <Transition appear show={true} as={Fragment}>
          <Dialog
            as="div"
            className="lockSettingsModal fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
          >
            <div className="min-h-screen px-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black opacity-30" />
              </TransitionChild>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 ltr:right-6 rtl:left-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2 ltr:text-left rtl:text-right"
                  >
                    {t('footer.modal.lock-settings-title')}
                  </DialogTitle>
                  <hr />
                  <div className="mt-6">{showLockItems()}</div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return <>{render()}</>;
};

export default LockSettingsModal;
