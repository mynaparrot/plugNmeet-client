import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogPanel, Button } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalDisplayLinkReqSchema,
  ExternalDisplayLinkTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateDisplayExternalLinkRoomModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

const DisplayExternalLinkModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const [link, setLink] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>();
  const [extraValues, setExtraValues] = useState({
    name: false,
    userId: false,
    role: false,
    meetingId: false,
  });

  const closeStartModal = () => {
    dispatch(updateDisplayExternalLinkRoomModal(false));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(undefined);

    let url;
    try {
      url = new URL(link);
    } catch (e) {
      console.error(e);
      setErrorMsg(t('external-display-link-display.link-invalid').toString());
      return;
    }

    const session = store.getState().session;
    if (extraValues.name) {
      url.searchParams.set('name', session.currentUser?.name ?? '');
    }
    if (extraValues.userId) {
      url.searchParams.set('userId', session.currentUser?.userId ?? '');
    }
    if (extraValues.role) {
      url.searchParams.set(
        'role',
        session.currentUser?.metadata?.isAdmin ? 'admin' : 'participant',
      );
    }
    if (extraValues.meetingId) {
      url.searchParams.set('meetingId', session.currentRoom.roomId);
    }

    const id = toast.loading(t('please-wait'), {
      type: 'info',
    });

    const body = create(ExternalDisplayLinkReqSchema, {
      task: ExternalDisplayLinkTask.START_EXTERNAL_LINK,
      url: url.toString(),
    });
    const r = await sendAPIRequest(
      'externalDisplayLink',
      toBinary(ExternalDisplayLinkReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (!res.status) {
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        autoClose: 1000,
      });
    }

    toast.dismiss(id);
    dispatch(updateDisplayExternalLinkRoomModal(false));
  };

  const renderDisplayForm = () => {
    return (
      <>
        <Dialog
          open={!isActive}
          as="div"
          className="relative z-10 focus:outline-hidden"
          onClose={() => false}
        >
          <div className="rtmpModalClose fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
            <div className="flex min-h-full items-center justify-center p-4">
              <DialogPanel
                transition
                className="w-full max-w-xl bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
              >
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950"
                >
                  <span>{t('external-display-link-display.modal-title')}</span>
                  <Button onClick={() => closeStartModal()}>
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                <div className="mt-8">
                  <form method="POST" onSubmit={(e) => onSubmit(e)}>
                    <div className="">
                      <label
                        htmlFor="stream-key"
                        className="block text-sm font-medium text-Gray-800"
                      >
                        {t('external-display-link-display.url')}
                      </label>
                      <input
                        type="text"
                        name="stream-key"
                        id="stream-key"
                        value={link}
                        onChange={(e) => setLink(e.currentTarget.value)}
                        className="h-11 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 mt-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
                      />
                      {errorMsg ? (
                        <div className="error-msg text-xs text-red-600 py-2">
                          {errorMsg}
                        </div>
                      ) : null}
                      <div className="text-xs py-2 text-Gray-800">
                        {t('external-display-link-display.note')}
                      </div>
                    </div>
                    <div className="mt-4">
                      <fieldset>
                        <div
                          className="text-base font-medium text-gray-900 "
                          aria-hidden="true"
                        >
                          {t('external-display-link-display.send-extra-values')}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-5">
                          <div className="item flex items-start">
                            <div className="input">
                              <input
                                id="name"
                                name="name"
                                type="checkbox"
                                checked={extraValues.name}
                                onChange={() => {
                                  const tmp = Object.assign({}, extraValues);
                                  tmp.name = !extraValues.name;
                                  setExtraValues(tmp);
                                }}
                                className="border border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus mt-1"
                              />
                            </div>
                            <div className="text-base w-full pl-4">
                              <label
                                htmlFor="name"
                                className="font-medium text-Gray-950"
                              >
                                {t('external-display-link-display.name')}
                                <p className="text-sm opacity-70">
                                  {t('external-display-link-display.name-des')}
                                </p>
                              </label>
                            </div>
                          </div>
                          <div className="item flex items-start">
                            <div className="input">
                              <input
                                id="user-id"
                                name="user-id"
                                type="checkbox"
                                checked={extraValues.userId}
                                onChange={() => {
                                  const tmp = Object.assign({}, extraValues);
                                  tmp.userId = !extraValues.userId;
                                  setExtraValues(tmp);
                                }}
                                className="border border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus mt-1"
                              />
                            </div>
                            <div className="text-base w-full pl-4">
                              <label
                                htmlFor="user-id"
                                className="font-medium text-Gray-950"
                              >
                                {t('external-display-link-display.user-id')}
                                <p className="text-sm opacity-70">
                                  {t(
                                    'external-display-link-display.user-id-des',
                                  )}
                                </p>
                              </label>
                            </div>
                          </div>
                          <div className="item flex items-start">
                            <div className="input">
                              <input
                                id="user-role"
                                name="user-role"
                                type="checkbox"
                                checked={extraValues.role}
                                onChange={() => {
                                  const tmp = Object.assign({}, extraValues);
                                  tmp.role = !extraValues.role;
                                  setExtraValues(tmp);
                                }}
                                className="border border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus mt-1"
                              />
                            </div>
                            <div className="text-base w-full pl-4">
                              <label
                                htmlFor="user-role"
                                className="font-medium text-Gray-950"
                              >
                                {t('external-display-link-display.user-role')}
                                <p className="text-sm opacity-70">
                                  {t(
                                    'external-display-link-display.user-role-des',
                                  )}
                                </p>
                              </label>
                            </div>
                          </div>
                          <div className="item flex items-start">
                            <div className="input">
                              <input
                                id="meeting-id"
                                name="meeting-id"
                                type="checkbox"
                                checked={extraValues.meetingId}
                                onChange={() => {
                                  const tmp = Object.assign({}, extraValues);
                                  tmp.meetingId = !extraValues.meetingId;
                                  setExtraValues(tmp);
                                }}
                                className="border border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus mt-1"
                              />
                            </div>
                            <div className="text-base w-full pl-4">
                              <label
                                htmlFor="meeting-id"
                                className="font-medium text-Gray-950"
                              >
                                {t('external-display-link-display.meeting-id')}
                                <p className="text-sm opacity-70">
                                  {t(
                                    'external-display-link-display.meeting-id-des',
                                  )}
                                </p>
                              </label>
                            </div>
                          </div>
                        </div>
                      </fieldset>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button
                        type="submit"
                        className="h-9 w-1/2 flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
                      >
                        {t('external-display-link-display.display')}
                      </button>
                    </div>
                  </form>
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      </>
    );
  };

  return <>{!isActive ? renderDisplayForm() : null}</>;
};

export default DisplayExternalLinkModal;
