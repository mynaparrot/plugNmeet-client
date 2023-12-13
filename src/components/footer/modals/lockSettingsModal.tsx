import React, { Fragment } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Transition, Dialog, Switch } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { updateShowLockSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import {
  CommonResponse,
  UpdateUserLockSettingsReq,
} from '../../../helpers/proto/plugnmeet_common_api_pb';

const roomLockSettingsSelector = createSelector(
  (state: RootState) => state.session.currentRoom.metadata,
  (metadata) => metadata?.default_lock_settings,
);
const LockSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const roomLockSettings = useAppSelector(roomLockSettingsSelector);
  const session = store.getState().session;

  const updateLockSettings = async (status, service: string) => {
    const direction = status ? 'lock' : 'unlock';

    const body = new UpdateUserLockSettingsReq({
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      userId: 'all',
      service,
      direction,
    });

    const r = await sendAPIRequest(
      'updateLockSettings',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

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
      <Switch.Group>
        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-microphone')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_microphone ?? false}
            onChange={(e) => updateLockSettings(e, 'mic')}
            className={`${
              roomLockSettings?.lock_microphone
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_microphone
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-webcams')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_webcam ?? false}
            onChange={(e) => updateLockSettings(e, 'webcam')}
            className={`${
              roomLockSettings?.lock_webcam
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_webcam
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-screen-sharing')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_screen_sharing ?? false}
            onChange={(e) => updateLockSettings(e, 'screenShare')}
            className={`${
              roomLockSettings?.lock_screen_sharing
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_screen_sharing
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-whiteboard')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_whiteboard ?? false}
            onChange={(e) => updateLockSettings(e, 'whiteboard')}
            className={`${
              roomLockSettings?.lock_whiteboard
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_whiteboard
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-shared-notepad')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_shared_notepad ?? false}
            onChange={(e) => updateLockSettings(e, 'sharedNotepad')}
            className={`${
              roomLockSettings?.lock_shared_notepad
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_shared_notepad
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-chat')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_chat ?? false}
            onChange={(e) => updateLockSettings(e, 'chat')}
            className={`${
              roomLockSettings?.lock_chat
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_chat
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-send-message')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_chat_send_message ?? false}
            onChange={(e) => updateLockSettings(e, 'sendChatMsg')}
            className={`${
              roomLockSettings?.lock_chat_send_message
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_chat_send_message
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-chat-file-share')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_chat_file_share ?? false}
            onChange={(e) => updateLockSettings(e, 'chatFile')}
            className={`${
              roomLockSettings?.lock_chat_file_share
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_chat_file_share
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Switch.Label className="ltr:pr-4 rtl:pl-4 w-full dark:text-darkText ltr:text-left rtl:text-right">
            {t('footer.modal.lock-private-chat')}
          </Switch.Label>
          <Switch
            checked={roomLockSettings?.lock_private_chat ?? false}
            onChange={(e) => updateLockSettings(e, 'privateChat')}
            className={`${
              roomLockSettings?.lock_private_chat
                ? 'bg-primaryColor dark:bg-darkSecondary2'
                : 'bg-gray-200 dark:bg-secondaryColor'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <span
              className={`${
                roomLockSettings?.lock_private_chat
                  ? 'ltr:translate-x-5 rtl:-translate-x-5'
                  : 'ltr:translate-x-1 rtl:translate-x-0'
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </Switch>
        </div>
      </Switch.Group>
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
                <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
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
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2 ltr:text-left rtl:text-right"
                  >
                    {t('footer.modal.lock-settings-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-6">{showLockItems()}</div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return <>{render()}</>;
};

export default LockSettingsModal;
