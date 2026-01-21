import React, { useCallback, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  EnableSipDialInReqSchema,
} from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../../store';
import { LoadingIcon } from '../../../assets/Icons/Loading';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import FormattedInputField from '../../../helpers/ui/formattedInputField';
import { getNatsConn } from '../../../helpers/nats';
import i18n from '../../../helpers/i18n';

const SipDialIn = () => {
  const { t } = useTranslation();
  const sipDialInFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom?.metadata?.roomFeatures?.sipDialInFeatures,
  );
  const [hidePhoneNumber, setHidePhoneNumber] = useState<boolean>(
    !!sipDialInFeatures?.hidePhoneNumber,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = useCallback(async () => {
    if (!sipDialInFeatures?.isAllow) {
      toast(t('sip-dial-in-features.feature-not-allow'), { type: 'error' });
      return;
    }
    setIsLoading(true);

    const body = create(EnableSipDialInReqSchema, {
      hidePhoneNumber,
    });

    const r = await sendAPIRequest(
      'enableSipDialIn',
      toBinary(EnableSipDialInReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    if (!res.status) {
      toast(t(res.msg), {
        type: 'error',
      });
    }

    setIsLoading(false);
  }, [t, sipDialInFeatures, hidePhoneNumber]);

  const publishToChat = async () => {
    const conn = getNatsConn();
    if (!conn) {
      return;
    }

    const formattedPhoneNumbers = sipDialInFeatures?.phoneNumbers.map(
      (phone) => <li key={phone}>{phone}</li>,
    );

    const elm = ReactDOMServer.renderToString(
      <div style={{ padding: '5px' }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>
          {i18n.t('sip-dial-in-features.dial-in-info')}
        </strong>
        <p style={{ margin: '2px 0' }}>
          {i18n.t('sip-dial-in-features.pin')}: {sipDialInFeatures?.pin}
        </p>
        <p style={{ margin: '2px 0' }}>
          {i18n.t('sip-dial-in-features.phone-numbers')}
        </p>
        <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
          {formattedPhoneNumbers}
        </ul>
      </div>,
    );
    await conn.sendChatMsg('public', elm);
  };

  const renderForm = () => {
    return (
      <form method="POST" onSubmit={(e) => e.preventDefault()}>
        <SettingsSwitch
          label={t('sip-dial-in-features.hide-phone-number')}
          enabled={hidePhoneNumber}
          onChange={setHidePhoneNumber}
          customCss="my-4"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="primary-button h-8 px-5 flex items-center justify-center text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <LoadingIcon
                className="inline h-5 w-5 animate-spin text-white"
                fillColor="currentColor"
              />
            ) : (
              t('sip-dial-in-features.activate')
            )}
          </button>
        </div>
      </form>
    );
  };

  const renderInfo = () => {
    return (
      <>
        <SettingsSwitch
          label={t('sip-dial-in-features.hide-phone-number')}
          enabled={hidePhoneNumber}
          onChange={setHidePhoneNumber}
          customCss="my-4"
          disabled={true}
        />
        <FormattedInputField
          label={t('sip-dial-in-features.pin')}
          id="pin"
          value={sipDialInFeatures?.pin}
          readOnly={true}
        />
        <div className="flex flex-wrap items-start justify-between my-5">
          <label className="pb-2 sm:pb-0 sm:pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right dark:text-dark-text">
            {t('sip-dial-in-features.phone-numbers', 'Phone numbers')}
          </label>
          {sipDialInFeatures?.phoneNumbers &&
          sipDialInFeatures.phoneNumbers.length > 0 ? (
            <ul className="grid gap-y-2 w-full max-w-full sm:max-w-[250px]">
              {sipDialInFeatures.phoneNumbers.map((phone) => (
                <li key={phone} className="flex items-center gap-2 text-sm">
                  <div className="thumb h-6 w-6 rounded-full bg-blue-500 text-xs font-medium text-white flex items-center justify-center overflow-hidden shrink-0">
                    P
                  </div>
                  <span className="text-Gray-950 dark:text-white break-all">
                    {phone}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(
                'sip-dial-in-features.no-phone-numbers',
                'No phone numbers available.',
              )}
            </p>
          )}
        </div>
        <div className="flex justify-end mt-10">
          <button
            onClick={publishToChat}
            className="primary-button h-8 px-5 flex items-center justify-center text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer"
          >
            {t('sip-dial-in-features.publish-to-chat')}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="mt-2">
      {sipDialInFeatures?.isActive ? renderInfo() : renderForm()}
    </div>
  );
};

export default SipDialIn;
