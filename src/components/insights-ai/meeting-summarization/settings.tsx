import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  InsightsAIMeetingSummarizationConfigReqSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppSelector } from '../../../store';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

interface MeetingSummarizationProps {
  setErrorMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
  closeModal: () => void;
}

const MeetingSummarization = ({
  setErrorMsg,
  closeModal,
}: MeetingSummarizationProps) => {
  const { t } = useTranslation();
  // all static values
  const { enabledSelfInsertEncryptionKey } = useMemo(() => {
    const enabledSelfInsertEncryptionKey =
      !!store.getState().session.currentRoom.metadata?.roomFeatures
        ?.endToEndEncryptionFeatures?.enabledSelfInsertEncryptionKey;
    return { enabledSelfInsertEncryptionKey };
  }, []);

  const meetingSummarizationFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.meetingSummarizationFeatures,
  );

  const [isEnabled, setIsEnabled] = useState(
    !!meetingSummarizationFeatures?.isEnabled,
  );
  const [summarizationPrompt, setSummarizationPrompt] = useState<string>(
    meetingSummarizationFeatures?.summarizationPrompt ?? '',
  );

  useEffect(() => {
    if (!meetingSummarizationFeatures?.summarizationPrompt) {
      setSummarizationPrompt(
        'Summarize this meeting conversation. Identify all key decisions and create a list of action items.',
      );
    }
  }, [meetingSummarizationFeatures?.summarizationPrompt]);

  const enableOrUpdateService = useCallback(async () => {
    if (!summarizationPrompt) {
      setErrorMsg(
        t('insights.meeting-summarization.summarization-prompt-required'),
      );
      return;
    }
    setErrorMsg(undefined);

    const body = create(InsightsAIMeetingSummarizationConfigReqSchema, {
      isEnabled,
      summarizationPrompt,
    });

    const r = await sendAPIRequest(
      'insights/ai/meetingSummarization/configure',
      toBinary(InsightsAIMeetingSummarizationConfigReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );

    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    if (!res.status) {
      setErrorMsg(t(res.msg));
      return;
    }

    toast(t('insights.service-started-successfully'), {
      type: 'info',
    });
    closeModal();
  }, [t, closeModal, setErrorMsg, isEnabled, summarizationPrompt]);

  const stopService = useCallback(async () => {
    const r = await sendAPIRequest(
      'insights/ai/meetingSummarization/end',
      [],
      false,
      'application/protobuf',
      'arraybuffer',
    );

    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    if (!res.status) {
      setErrorMsg(t(res.msg));
      return;
    }

    toast(t('insights.service-stopped-successfully'), {
      type: 'info',
    });
    closeModal();
  }, [t, setErrorMsg, closeModal]);

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSummarizationPrompt(evt.target?.value);
    },
    [],
  );

  if (enabledSelfInsertEncryptionKey) {
    return (
      <div className="p-4 bg-Gray-2">
        <div className="main-wrap -my-4 text-red-600">
          {t('insights.feature-disable-while-e2ee-self-key-enabled')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-Gray-2">
        <div className="main-wrap -my-4">
          <div className="grid">
            <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
              <SettingsSwitch
                label={t('insights.meeting-summarization.enable')}
                enabled={isEnabled}
                onChange={setIsEnabled}
                customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
              />
            </div>
            {isEnabled && (
              <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-5 py-4">
                <label
                  htmlFor="summarizationPrompt"
                  className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
                >
                  {t(
                    'insights.meeting-summarization.summarization-prompt-label',
                  )}
                </label>
                <textarea
                  name="summarizationPrompt"
                  id="summarizationPrompt"
                  className="w-full outline-none text-xs 3xl:text-sm text-Gray-900 dark:text-white p-2 border border-Gray-200 dark:border-Gray-800 rounded-lg resize-y"
                  value={summarizationPrompt}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-Gray-100 dark:border-Gray-800 flex justify-end items-center gap-4 rounded-b-xl">
        {!meetingSummarizationFeatures?.isEnabled ? (
          <button
            className="button-blue h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={() => enableOrUpdateService()}
          >
            {t('insights.start-service')}
          </button>
        ) : (
          <button
            className="button-white h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
            onClick={() => stopService()}
          >
            {t('insights.stop-service')}
          </button>
        )}
      </div>
    </>
  );
};

export default MeetingSummarization;
