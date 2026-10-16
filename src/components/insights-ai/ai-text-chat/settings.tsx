import React, { useCallback, useState } from 'react';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { CommonResponseSchema, InsightsAITextChatConfigReqSchema } from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../../store';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import UsersSelector from './usersSelector';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

interface AiTextChatSettingsProps {
  setErrorMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
  closeModal: () => void;
}

const AiTextChatSettings = ({ setErrorMsg, closeModal }: AiTextChatSettingsProps) => {
  const { t } = useTranslation();
  const aiTextChatFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.aiFeatures
        ?.aiTextChatFeatures,
  );

  const [isEnabled, setIsEnabled] = useState(!!aiTextChatFeatures?.isEnabled);
  const [isAllowedEveryone, setIsAllowedEveryone] = useState(
    !!aiTextChatFeatures?.isAllowedEveryone,
  );
  const [allowedUsers, setAllowedUsers] = useState<string[]>(
    aiTextChatFeatures?.allowedUserIds ?? [],
  );
  const [isNotepadAiDisabled, setIsNotepadAiDisabled] = useState(
    !!aiTextChatFeatures?.isNotepadAiDisabled,
  );
  const [isWhiteboardAiDisabled, setIsWhiteboardAiDisabled] = useState(
    !!aiTextChatFeatures?.isWhiteboardAiDisabled,
  );
  const [isPollAiDisabled, setIsPollAiDisabled] = useState(!!aiTextChatFeatures?.isPollAiDisabled);

  const enableOrUpdateService = useCallback(async () => {
    if (!isAllowedEveryone && allowedUsers.length == 0) {
      setErrorMsg(t('insights.ai-text-chat.users-required'));
      return;
    }
    setErrorMsg(undefined);

    const body = create(InsightsAITextChatConfigReqSchema, {
      isEnabled: isEnabled,
      isAllowedEveryone,
      allowedUserIds: allowedUsers,
      isNotepadAiDisabled,
      isWhiteboardAiDisabled,
      isPollAiDisabled,
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
    closeModal();
  }, [
    t,
    setErrorMsg,
    closeModal,
    isEnabled,
    isAllowedEveryone,
    allowedUsers,
    isNotepadAiDisabled,
    isWhiteboardAiDisabled,
    isPollAiDisabled,
  ]);

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

  return (
    <>
      <div className="p-4 bg-Gray-25 dark:bg-dark-primary">
        <div className="main-wrap -my-4">
          <div className="grid">
            <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
              <SettingsSwitch
                label={t('insights.ai-text-chat.enable')}
                enabled={isEnabled}
                onChange={setIsEnabled}
              />
            </div>
            {isEnabled && (
              <>
                <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
                  <SettingsSwitch
                    label={t('insights.ai-text-chat.enable-notepad-ai')}
                    enabled={!isNotepadAiDisabled}
                    onChange={(enabled) => setIsNotepadAiDisabled(!enabled)}
                  />
                </div>
                <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
                  <SettingsSwitch
                    label={t('insights.ai-text-chat.enable-whiteboard-ai')}
                    enabled={!isWhiteboardAiDisabled}
                    onChange={(enabled) => setIsWhiteboardAiDisabled(!enabled)}
                  />
                </div>
                <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
                  <SettingsSwitch
                    label={t('insights.ai-text-chat.enable-poll-ai')}
                    enabled={!isPollAiDisabled}
                    onChange={(enabled) => setIsPollAiDisabled(!enabled)}
                  />
                </div>
                <div className="my-4 min-w-0 rounded-xl border border-Gray-200 dark:border-Gray-700 bg-Gray-50 dark:bg-dark-secondary2 p-3 sm:p-4">
                  <fieldset className="m-0 min-w-0 border-0 p-0">
                    <legend className="text-sm font-semibold text-Gray-900 dark:text-white">
                      {t('insights.ai-text-chat.access-scope-title')}
                    </legend>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-center justify-center min-h-10 3xl:min-h-11 px-3 text-center text-sm 3xl:text-base font-semibold border rounded-[12px] md:rounded-[15px] cursor-pointer transition-all duration-300 shadow-button-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-Blue ${
                          isAllowedEveryone
                            ? 'bg-Blue2-50 dark:bg-Blue2-800 border-Blue2-500 text-Gray-950 dark:text-white'
                            : 'bg-white hover:bg-Gray-100 dark:bg-dark-secondary dark:hover:bg-dark-secondary3 border-Gray-300 dark:border-Gray-800 text-Gray-800 dark:text-white'
                        }`}
                      >
                        <input
                          type="radio"
                          id="ai-text-chat-access-everyone"
                          name="ai-text-chat-access-scope"
                          checked={isAllowedEveryone}
                          onChange={() => setIsAllowedEveryone(true)}
                          className="sr-only"
                        />
                        {t('insights.ai-text-chat.access-everyone')}
                      </label>
                      <label
                        className={`flex items-center justify-center min-h-10 3xl:min-h-11 px-3 text-center text-sm 3xl:text-base font-semibold border rounded-[12px] md:rounded-[15px] cursor-pointer transition-all duration-300 shadow-button-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-Blue ${
                          !isAllowedEveryone
                            ? 'bg-Blue2-50 dark:bg-Blue2-800 border-Blue2-500 text-Gray-950 dark:text-white'
                            : 'bg-white hover:bg-Gray-100 dark:bg-dark-secondary dark:hover:bg-dark-secondary3 border-Gray-300 dark:border-Gray-800 text-Gray-800 dark:text-white'
                        }`}
                      >
                        <input
                          type="radio"
                          id="ai-text-chat-access-selected"
                          name="ai-text-chat-access-scope"
                          checked={!isAllowedEveryone}
                          onChange={() => setIsAllowedEveryone(false)}
                          className="sr-only"
                        />
                        {t('insights.ai-text-chat.access-selected')}
                      </label>
                    </div>
                    {!isAllowedEveryone && (
                      <div className="mt-4 border-t border-Gray-200 dark:border-Gray-700 pt-4">
                        <UsersSelector
                          selectedUsers={allowedUsers}
                          setSelectedUsers={setAllowedUsers}
                        />
                      </div>
                    )}
                  </fieldset>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-Gray-100 dark:border-Gray-800 flex justify-end items-center gap-4 rounded-b-xl">
        {!aiTextChatFeatures?.isEnabled && (
          <button
            className="primary-button focus-ring h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={() => enableOrUpdateService()}
          >
            {t('insights.start-service')}
          </button>
        )}
        {aiTextChatFeatures?.isEnabled && (
          <>
            <button
              className="secondary-button focus-ring h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
              onClick={() => stopService()}
            >
              {t('insights.stop-service')}
            </button>
            <button
              className="primary-button focus-ring h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
              onClick={() => enableOrUpdateService()}
            >
              {t('insights.update-service')}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default AiTextChatSettings;
