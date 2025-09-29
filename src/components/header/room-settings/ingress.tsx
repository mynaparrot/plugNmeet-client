import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CreateIngressReqSchema,
  CreateIngressResSchema,
  IngressInput,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { LoadingIcon } from '../../../assets/Icons/Loading';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';
import FormattedInputField from '../../../helpers/ui/formattedInputField';

const Ingress = () => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>('broadcaster');
  const [ingressType, setIngressType] = useState<IngressInput>(
    IngressInput.RTMP_INPUT,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const session = store.getState().session;
  const ingressFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom?.metadata?.roomFeatures?.ingressFeatures,
  );

  const handleSubmit = useCallback(async () => {
    if (!ingressFeatures?.isAllow) {
      toast(t('ingress-features.feature-not-allow'), { type: 'error' });
      return;
    }
    setIsLoading(true);

    const body = create(CreateIngressReqSchema, {
      inputType: ingressType,
      participantName: name || 'broadcaster',
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
      });
    }

    setIsLoading(false);
  }, [ingressFeatures, session.currentRoom, ingressType, name, t]);

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

  const renderForm = () => {
    return (
      <form method="POST" onSubmit={(e) => e.preventDefault()}>
        <Dropdown
          label={t('ingress-features.ingress-type')}
          id="ingress-type"
          value={ingressType}
          onChange={setIngressType}
          options={Object.values(IngressInput)
            .filter((v) => typeof v === 'number')
            .map((v) => {
              return {
                value: v,
                text: getIngressTypeText(v as number),
              } as ISelectOption;
            })}
        />
        <FormattedInputField
          label={t('ingress-features.join-as-name')}
          id="name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="broadcaster"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="h-8 px-5 flex items-center justify-center text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <LoadingIcon
                className="inline h-5 w-5 animate-spin text-white"
                fillColor="currentColor"
              />
            ) : (
              t('ingress-features.gen-link')
            )}
          </button>
        </div>
      </form>
    );
  };

  const renderInfo = () => {
    return (
      <>
        <FormattedInputField
          label={t('ingress-features.ingress-type')}
          id="ingress_type"
          value={getIngressTypeText(
            ingressFeatures?.inputType ?? IngressInput.RTMP_INPUT,
          )}
          readOnly={true}
        />
        <FormattedInputField
          label={t('ingress-features.stream-url')}
          id="url"
          value={ingressFeatures?.url}
          readOnly={true}
        />
        <FormattedInputField
          label={t('ingress-features.stream-key')}
          id="stream_key"
          value={ingressFeatures?.streamKey}
          readOnly={true}
        />
      </>
    );
  };

  return (
    <div className="mt-2">
      {ingressFeatures?.url && ingressFeatures?.streamKey
        ? renderInfo()
        : renderForm()}
    </div>
  );
};

export default Ingress;
