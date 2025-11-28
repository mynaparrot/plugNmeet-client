import React, { useCallback, useState } from 'react';
import { fromBinary } from '@bufbuild/protobuf';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { CommonResponseSchema } from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../../store';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import FormattedInputField from '../../../helpers/ui/formattedInputField';

interface MeetingSummarizationProps {
  setErrorMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
  closeModal: () => void;
}

const MeetingSummarization = ({
  setErrorMsg,
  closeModal,
}: MeetingSummarizationProps) => {
  const { t } = useTranslation();
  const meetingSummarizationFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.meetingSummarizationFeatures,
  );

  const [isEnabled, setIsEnabled] = useState(
    !!meetingSummarizationFeatures?.isEnabled,
  );
  const [summarizationPrompt, setSummarizationPrompt] = useState<string>(
    meetingSummarizationFeatures?.summarizationPrompt ??
      'Summarize this meeting conversation. Identify all key decisions and create a list of action items with assigned owners.',
  );

  const enableOrUpdateService = useCallback(async () => {
    console.log(summarizationPrompt);
    /*if (!isAllowedEveryone && allowedUsers.length == 0) {
      setErrorMsg(t('insights.ai-text-chat.users-required'));
      return;
    }
    setErrorMsg(undefined);

    const body = create(InsightsAITextChatConfigReqSchema, {
      isEnabled: isEnabled,
      isAllowedEveryone,
      allowedUserIds: allowedUsers,
    });

    const r = await sendAPIRequest(
      'insights/ai/textChat/configure',
      toBinary(InsightsAITextChatConfigReqSchema, body),
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
    closeModal();*/
  }, [summarizationPrompt]);

  const stopService = useCallback(async () => {
    const r = await sendAPIRequest(
      'insights/ai/textChat/end',
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
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setSummarizationPrompt(evt.target?.value);
    },
    [],
  );

  return (
    <>
      <div className="p-4 bg-Gray-2">
        <div className="main-wrap -my-4">
          <div className="grid">
            <div className="bg-Gray-25 border-y border-dotted border-Gray-100 -mx-4 px-4 py-4">
              <SettingsSwitch
                label={t('insights.meeting-summarization.enable')}
                enabled={isEnabled}
                onChange={setIsEnabled}
                customCss="shadow-Icon-box h-11 border border-Gray-100 rounded-2xl px-4 bg-white"
              />
            </div>
            {isEnabled && (
              <>
                <div className="bg-Gray-25 border-y border-dotted border-Gray-100 -mx-4 px-4 py-4">
                  <FormattedInputField
                    id="summarizationPrompt"
                    label={t(
                      'insights.meeting-summarization.summarization-prompt',
                    )}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-Gray-100 flex justify-end items-center gap-4 rounded-b-xl">
        {!meetingSummarizationFeatures?.isEnabled ? (
          <button
            className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={() => enableOrUpdateService()}
          >
            {t('insights.start-service')}
          </button>
        ) : (
          <button
            className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
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
