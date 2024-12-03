import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogPanel, Button } from '@headlessui/react';
import { isURL, isEmpty } from 'validator';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RecordingReqSchema,
  RecordingTasks,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateShowRtmpModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

const RtmpModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
  );
  const [provider, setProvider] = useState<string>('youtube');
  const [showServerUrl, setShowServerUrl] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [serverKey, setServerKey] = useState<string>('');
  const providers = {
    youtube: 'rtmp://a.rtmp.youtube.com/live2/',
    facebook: 'rtmps://live-api-s.facebook.com:443/rtmp/',
  };

  useEffect(() => {
    if (provider === 'other') {
      setShowServerUrl(true);
    } else {
      setShowServerUrl(false);
    }
  }, [provider]);

  const closeStartModal = () => {
    dispatch(updateShowRtmpModal(false));
  };

  const startBroadcasting = async (e) => {
    e.preventDefault();
    if (provider === 'other' && isEmpty(serverUrl)) {
      return;
    }
    if (isEmpty(serverKey)) {
      return;
    }
    let url: string;
    if (provider === 'other') {
      url = serverUrl;
    } else {
      url = providers[provider];
    }

    const isvalid = isURL(url, {
      protocols: ['rtmp', 'rtmps'],
    });

    if (!isvalid) {
      return;
    }

    const body = create(RecordingReqSchema, {
      task: RecordingTasks.START_RTMP,
      sid: store.getState().session.currentRoom.sid,
      rtmpUrl: url + '/' + serverKey,
    });

    if (typeof (window as any).DESIGN_CUSTOMIZATION !== 'undefined') {
      body.customDesign = `${(window as any).DESIGN_CUSTOMIZATION}`.replace(
        /\s/g,
        '',
      );
    }

    const r = await sendAPIRequest(
      'rtmp',
      toBinary(RecordingReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    let msg = 'footer.notice.rtmp-starting';

    if (!res.status) {
      msg = res.msg;
    }

    toast(t(msg), {
      toastId: 'rtmp-status',
      type: 'info',
    });

    dispatch(updateShowRtmpModal(false));
  };

  const renderStartBroadcast = () => {
    return (
      <>
        <Dialog
          open={!isActiveRtmpBroadcasting}
          as="div"
          className="relative z-10 focus:outline-none"
          onClose={() => false}
        >
          <div className="rtmpModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
            <div className="flex min-h-full items-center justify-center p-4">
              <DialogPanel
                transition
                className="w-full max-w-96 bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
              >
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950"
                >
                  <span>{t('footer.modal.rtmp-title')}</span>
                  <Button onClick={() => closeStartModal()}>
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                <div className="mt-5">
                  <form
                    action="#"
                    method="POST"
                    onSubmit={(e) => startBroadcasting(e)}
                  >
                    <div className="s">
                      <div className="grid gap-3">
                        <div className="">
                          <label
                            htmlFor="provider"
                            className="block text-sm font-medium text-Gray-800"
                          >
                            {t('footer.modal.rtmp-select-provider')}
                          </label>

                          <select
                            id="provider"
                            name="provider"
                            className="h-11 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 mt-1 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus"
                            onChange={(e) => setProvider(e.currentTarget.value)}
                            value={provider}
                          >
                            <option value="youtube">YouTube</option>
                            <option value="facebook">Facebook</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        {showServerUrl ? (
                          <div className="">
                            <label
                              htmlFor="stream-url"
                              className="block text-sm font-medium text-Gray-800"
                            >
                              {t('footer.modal.rtmp-server-url')}
                            </label>
                            <input
                              type="text"
                              name="stream-url"
                              id="stream-url"
                              value={serverUrl}
                              onChange={(e) =>
                                setServerUrl(e.currentTarget.value)
                              }
                              className="h-11 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 mt-1 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus"
                            />
                          </div>
                        ) : null}
                        <div className="">
                          <label
                            htmlFor="stream-key"
                            className="block text-sm font-medium text-Gray-800"
                          >
                            {t('footer.modal.rtmp-stream-key')}
                          </label>
                          <input
                            type="text"
                            name="stream-key"
                            id="stream-key"
                            value={serverKey}
                            onChange={(e) =>
                              setServerKey(e.currentTarget.value)
                            }
                            className="h-11 rounded-[15px] border border-Gray-300 bg-white shadow-input w-full px-3 mt-1 outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button
                        type="submit"
                        className="h-9 w-1/2 flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow outline-none focus:border-[rgba(0,161,242,1)] focus:shadow-inputFocus"
                      >
                        {t('footer.modal.rtmp-start-broadcast')}
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

  const onCloseAlertModal = async (status = false) => {
    dispatch(updateShowRtmpModal(false));
    if (!status) {
      return;
    }

    const body = create(RecordingReqSchema, {
      task: RecordingTasks.STOP_RTMP,
      sid: store.getState().session.currentRoom.sid,
    });

    const r = await sendAPIRequest(
      'rtmp',
      toBinary(RecordingReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    let msg = t('footer.notice.rtmp-ending');

    if (!res.status) {
      msg = res.msg;
    }

    toast(t(msg), {
      toastId: 'rtmp-status',
      type: 'info',
    });
  };

  const alertModal = () => {
    return (
      <>
        <Dialog
          open={isActiveRtmpBroadcasting}
          as="div"
          className="relative z-10 focus:outline-none"
          onClose={onCloseAlertModal}
        >
          <div className="rtmpModalClose fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
            <div className="flex min-h-full items-center justify-center p-4">
              <DialogPanel
                transition
                className="w-full max-w-96 bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
              >
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950"
                >
                  <span>{t('footer.modal.rtmp-close-confirm')}</span>
                  <Button onClick={() => onCloseAlertModal()}>
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </Button>
                </DialogTitle>
                <div className="mt-8 text-sm leading-5 text-Gray-700">
                  {t('footer.modal.rtmp-close-msg')}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <Button
                    className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow"
                    onClick={() => onCloseAlertModal(true)}
                  >
                    {t('ok')}
                  </Button>
                  <Button
                    className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
                    onClick={() => onCloseAlertModal(false)}
                  >
                    {t('close')}
                  </Button>
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      </>
    );
  };

  return (
    <>{!isActiveRtmpBroadcasting ? renderStartBroadcast() : alertModal()}</>
  );
};

export default RtmpModal;
