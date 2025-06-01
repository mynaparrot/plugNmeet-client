import React, { useEffect, useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { isEmpty } from 'es-toolkit/compat';
import {
  CreateIngressReqSchema,
  CreateIngressResSchema,
  IngressInput,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  Field,
  Label,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Listbox,
  Transition,
} from '@headlessui/react';

import { store, useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';

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

  const getIngressTypeText = (type: number) => {
    switch (type) {
      case IngressInput.RTMP_INPUT:
        return t('ingress-features.ingress-type-rtmp');
      case IngressInput.WHIP_INPUT:
        return t('ingress-features.ingress-type-whip');
      default:
        return '';
    }
  };

  const renderFrom = () => {
    return (
      <>
        <form method="POST" onSubmit={(e) => onSubmit(e)}>
          <Field>
            <div className="flex items-center justify-between mb-2">
              <Label
                htmlFor="ingress-type"
                className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right"
              >
                {t('ingress-features.ingress-type')}
              </Label>
              <Listbox
                value={ingressType}
                onChange={(value) => setIngressType(value)}
              >
                <div className="relative w-full max-w-[250px]">
                  <ListboxButton
                    className={`h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus focus:shadow-input-focus text-left text-sm`}
                  >
                    <span className="block truncate">
                      {getIngressTypeText(ingressType)}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <DropdownIconSVG />
                    </span>
                  </ListboxButton>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5">
                      {Object.values(IngressInput).map((val) =>
                        typeof val !== 'number' ? null : (
                          <ListboxOption
                            key={val}
                            value={val}
                            className={({ focus, selected }) =>
                              `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                                focus ? 'bg-Blue2-50' : ''
                              } ${selected ? 'bg-Blue2-50' : ''}`
                            }
                          >
                            {({ selected }) => (
                              <>
                                <span className={`block truncate`}>
                                  {getIngressTypeText(val)}
                                </span>
                                {selected ? (
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                                    <CheckMarkIcon />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </ListboxOption>
                        ),
                      )}
                    </ListboxOptions>
                  </Transition>
                </div>
              </Listbox>
            </div>
          </Field>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="stream-key"
              className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right"
            >
              {t('ingress-features.join-as-name')}
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              className="default-input rounded-[8px]! w-full max-w-[250px] h-10!"
            />
            {errorMsg ? (
              <div className="error-msg text-xs text-red-600 py-2">
                {errorMsg}
              </div>
            ) : null}
          </div>
          <div className="text-right mt-4">
            <button
              type="submit"
              className="h-10 px-8 text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
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
              className="pr-4 w-full dark:text-dark-text"
            >
              {t('ingress-features.ingress-type')}
            </label>
            <input
              type="text"
              readOnly={true}
              name="ingress_type"
              id="ingress_type"
              value={ingressTypeText}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-xs sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-dark-text bg-transparent dark:text-dark-text"
            />
          </div>
        </div>
        <div className="grid">
          <div className="flex items-center justify-start">
            <label htmlFor="url" className="pr-4 w-full dark:text-dark-text">
              {t('ingress-features.stream-url')}
            </label>
            <input
              type="text"
              readOnly={true}
              name="url"
              id="url"
              value={ingressFeatures?.url}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-xs sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-dark-text bg-transparent dark:text-dark-text"
            />
          </div>
        </div>
        <div className="grid">
          <div className="flex items-center justify-start">
            <label
              htmlFor="stream_key"
              className="pr-4 w-full dark:text-dark-text"
            >
              {t('ingress-features.stream-key')}
            </label>
            <input
              type="text"
              readOnly={true}
              name="stream_key"
              id="stream_key"
              value={ingressFeatures?.streamKey}
              className="mt-1 px-4 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-xs sm:text-sm rounded-md h-10 border border-solid border-black/50 dark:border-dark-text bg-transparent dark:text-dark-text"
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
