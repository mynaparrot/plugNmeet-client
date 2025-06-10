import React, { Fragment, useCallback, useState } from 'react';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  Switch,
  Field,
  Transition,
  TransitionChild,
  Label,
  Button,
} from '@headlessui/react';
import {
  CommonResponseSchema,
  UpdateUserLockSettingsReqSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowLockSettingsModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

const LockSettingsModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const roomLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );
  const session = store.getState().session;

  const updateLockSettings = useCallback(
    async (status: boolean, service: string) => {
      if (isBusy) {
        return;
      }
      setIsBusy(true);

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
        dispatch(
          addUserNotification({
            message: t('footer.notice.applied-settings'),
            typeOption: 'info',
          }),
        );
      } else {
        dispatch(
          addUserNotification({
            message: res.msg,
            typeOption: 'error',
          }),
        );
      }

      setIsBusy(false);
    },
    //eslint-disable-next-line
    [isBusy],
  );

  const closeModal = () => {
    dispatch(updateShowLockSettingsModal(false));
  };

  const showLockItems = () => {
    return (
      <>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-microphone')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockMicrophone ?? false}
              onChange={(e) => updateLockSettings(e, 'mic')}
              className={`${
                roomLockSettings?.lockMicrophone
                  ? 'bg-Blue2-500'
                  : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockMicrophone
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-webcams')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockWebcam ?? false}
              onChange={(e) => updateLockSettings(e, 'webcam')}
              className={`${
                roomLockSettings?.lockWebcam ? 'bg-Blue2-500' : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockWebcam
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-screen-sharing')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockScreenSharing ?? false}
              onChange={(e) => updateLockSettings(e, 'screenShare')}
              className={`${
                roomLockSettings?.lockScreenSharing
                  ? 'bg-Blue2-500'
                  : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockScreenSharing
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-whiteboard')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockWhiteboard ?? false}
              onChange={(e) => updateLockSettings(e, 'whiteboard')}
              className={`${
                roomLockSettings?.lockWhiteboard
                  ? 'bg-Blue2-500'
                  : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockWhiteboard
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-shared-notepad')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockSharedNotepad ?? false}
              onChange={(e) => updateLockSettings(e, 'sharedNotepad')}
              className={`${
                roomLockSettings?.lockSharedNotepad
                  ? 'bg-Blue2-500'
                  : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockSharedNotepad
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-chat')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockChat ?? false}
              onChange={(e) => updateLockSettings(e, 'chat')}
              className={`${
                roomLockSettings?.lockChat ? 'bg-Blue2-500' : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockChat
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-send-message')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockChatSendMessage ?? false}
              onChange={(e) => updateLockSettings(e, 'sendChatMsg')}
              className={`${
                roomLockSettings?.lockChatSendMessage
                  ? 'bg-Blue2-500'
                  : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockChatSendMessage
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-chat-file-share')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockChatFileShare ?? false}
              onChange={(e) => updateLockSettings(e, 'chatFile')}
              className={`${
                roomLockSettings?.lockChatFileShare
                  ? 'bg-Blue2-500'
                  : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockChatFileShare
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
        <Field>
          <div className="flex items-center justify-between my-4">
            <Label className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right">
              {t('footer.modal.lock-private-chat')}
            </Label>
            <Switch
              checked={roomLockSettings?.lockPrivateChat ?? false}
              onChange={(e) => updateLockSettings(e, 'privateChat')}
              className={`${
                roomLockSettings?.lockPrivateChat
                  ? 'bg-Blue2-500'
                  : 'bg-Gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2`}
            >
              <span
                className={`${
                  roomLockSettings?.lockPrivateChat
                    ? 'ltr:translate-x-6 rtl:-translate-x-5'
                    : 'ltr:translate-x-1 rtl:-translate-x-0.5'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </Switch>
          </div>
        </Field>
      </>
    );
  };

  return (
    <>
      <Transition appear show={true} as={Fragment}>
        <Dialog
          as="div"
          className="lockSettingsModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
          onClose={() => false}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-full max-w-2xl bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out">
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
                >
                  <span>{t('footer.modal.lock-settings-title')}</span>
                  <Button onClick={() => closeModal()}>
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                <hr />
                <div className="mt-4">{showLockItems()}</div>
              </div>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default LockSettingsModal;
