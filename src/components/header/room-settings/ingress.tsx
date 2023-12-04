import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';

import {
  CreateIngressReq,
  CreateIngressRes,
  IngressInput,
} from '../../../helpers/proto/plugnmeet_ingress_pb';
import { RootState, store, useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const ingressFeaturesSelector = createSelector(
  (state: RootState) => state.session.currentRoom?.metadata?.room_features,
  (room_features) => room_features?.ingress_features,
);

const Ingress = () => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>('broadcaster');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ingressType, setIngressType] = useState<IngressInput>(
    IngressInput.RTMP_INPUT,
  );
  const session = store.getState().session;
  const ingressFeatures = useAppSelector(ingressFeaturesSelector);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!ingressFeatures?.is_allow) {
      setErrorMsg(t('ingress-features.feature-not-allow'));
      return;
    }
    let participantName = name;

    if (isEmpty(participantName)) {
      participantName = 'broadcaster';
    }

    const body = new CreateIngressReq({
      inputType: ingressType,
      participantName: participantName,
      roomId: session.currentRoom.room_id,
    });

    const r = await sendAPIRequest(
      'ingress/create',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CreateIngressRes.fromBinary(new Uint8Array(r));
    if (!res.status) {
      toast(t(res.msg), {
        type: 'error',
        isLoading: false,
        autoClose: 1000,
      });
    }
  };

  const renderFrom = () => {
    return (
      <>
        <form method="POST" onSubmit={(e) => onSubmit(e)}>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="quality"
              className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right"
            >
              {t('ingress-features.ingress-type')}
            </label>
            <select
              id="quality"
              name="quality"
              className="mt-1 block py-2 px-3 border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={ingressType}
              onChange={(e) => setIngressType(Number(e.target.value))}
            >
              <option value={IngressInput.RTMP_INPUT}>
                {t('ingress-features.ingress-type-rtmp')}
              </option>
              <option value={IngressInput.WHIP_INPUT}>
                {t('ingress-features.ingress-type-whip')}
              </option>
            </select>
          </div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="stream-key"
              className="pr-4 w-full dark:text-darkText ltr:text-left rtl:text-right"
            >
              {t('ingress-features.join-as-name')}
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-darkText bg-transparent dark:text-darkText"
            />
            {errorMsg ? (
              <div className="error-msg text-xs text-red-600 py-2">
                {errorMsg}
              </div>
            ) : null}
          </div>
          <div className="pb-3 pt-4 bg-gray-50 dark:bg-transparent text-right mt-4">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none focus:ring-2 focus:ring-offset-2 focus:bg-secondaryColor"
            >
              {t('ingress-features.gen-link')}
            </button>
          </div>
        </form>
      </>
    );
  };

  const render = () => {
    return (
      <>
        <div className="grid">
          <div className="flex items-center justify-start">
            <label
              htmlFor="ingress_type"
              className="pr-4 w-full dark:text-darkText"
            >
              {t('ingress-features.ingress-type')}
            </label>
            <input
              type="text"
              readOnly={true}
              name="ingress_type"
              id="ingress_type"
              value={ingressFeatures?.input_type?.toString()}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-darkText bg-transparent dark:text-darkText"
            />
          </div>
        </div>
        <div className="grid">
          <div className="flex items-center justify-start">
            <label htmlFor="url" className="pr-4 w-full dark:text-darkText">
              {t('ingress-features.stream-url')}
            </label>
            <input
              type="text"
              readOnly={true}
              name="url"
              id="url"
              value={ingressFeatures?.url}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-darkText bg-transparent dark:text-darkText"
            />
          </div>
        </div>
        <div className="grid">
          <div className="flex items-center justify-start">
            <label
              htmlFor="stream_key"
              className="pr-4 w-full dark:text-darkText"
            >
              {t('ingress-features.stream-key')}
            </label>
            <input
              type="text"
              readOnly={true}
              name="stream_key"
              id="stream_key"
              value={ingressFeatures?.stream_key}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-darkText bg-transparent dark:text-darkText"
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="mt-2">
      {isEmpty(ingressFeatures?.url) && isEmpty(ingressFeatures?.stream_key)
        ? renderFrom()
        : render()}
    </div>
  );
};

export default Ingress;
