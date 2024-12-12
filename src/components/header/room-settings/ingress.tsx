import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { isEmpty } from 'lodash';
import {
  CreateIngressReqSchema,
  CreateIngressResSchema,
  IngressInput,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const Ingress = () => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>('broadcaster');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ingressType, setIngressType] = useState<IngressInput>(
    IngressInput.RTMP_INPUT,
  );
  const [ingressTypeText, setIngressTypeText] = useState<string>('UNKNOWN');
  const session = store.getState().session;
  const ingressFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom?.metadata?.roomFeatures?.ingressFeatures,
  );

  useEffect(() => {
    switch (ingressType) {
      case IngressInput.RTMP_INPUT:
        setIngressTypeText('RTMP');
        break;
      case IngressInput.WHIP_INPUT:
        setIngressTypeText('WHIP');
        break;
      default:
        setIngressTypeText('UNKNOWN');
    }
  }, [ingressType]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!ingressFeatures?.isAllow) {
      setErrorMsg(t('ingress-features.feature-not-allow'));
      return;
    }
    let participantName = name;

    if (isEmpty(participantName)) {
      participantName = 'broadcaster';
    }

    const body = create(CreateIngressReqSchema, {
      inputType: ingressType,
      participantName: participantName,
      roomId: session.currentRoom.roomId,
    });

    const r = await sendAPIRequest(
      'ingress/create',
      toBinary(CreateIngressReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CreateIngressResSchema, new Uint8Array(r));
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
              value={ingressTypeText}
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
              value={ingressFeatures?.streamKey}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-darkText bg-transparent dark:text-darkText"
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="mt-2">
      {isEmpty(ingressFeatures?.url) && isEmpty(ingressFeatures?.streamKey)
        ? renderFrom()
        : render()}
    </div>
  );
};

export default Ingress;
