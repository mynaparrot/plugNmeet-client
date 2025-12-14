import React, { useCallback, useState } from 'react';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  InsightsAITextChatConfigReqSchema,
} from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../../store';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import UsersSelector from './usersSelector';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

interface AiTextChatSettingsProps {
  setErrorMsg: React.Dispatch<React.SetStateAction<string | undefined>>;
  closeModal: () => void;
}

const AiTextChatSettings = ({
  setErrorMsg,
  closeModal,
}: AiTextChatSettingsProps) => {
  const { t } = useTranslation();
  const aiTextChatFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures,
  );

  const [isEnabled, setIsEnabled] = useState(!!aiTextChatFeatures?.isEnabled);
  const [isAllowedEveryone, setIsAllowedEveryone] = useState(
    !!aiTextChatFeatures?.isAllowedEveryone,
  );
  const [allowedUsers, setAllowedUsers] = useState<string[]>(
    aiTextChatFeatures?.allowedUserIds ?? [],
  );

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
  }, [t, setErrorMsg, closeModal, isEnabled, isAllowedEveryone, allowedUsers]);

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
      <div className="p-4 bg-Gray-2">
        <div className="main-wrap -my-4">
          <div className="grid">
            <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
              <SettingsSwitch
                label={t('insights.ai-text-chat.enable')}
                enabled={isEnabled}
                onChange={setIsEnabled}
                customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
              />
            </div>
            {isEnabled && (
              <>
                <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
                  <SettingsSwitch
                    label={t('insights.ai-text-chat.allow-everyone')}
                    enabled={isAllowedEveryone}
                    onChange={setIsAllowedEveryone}
                    customCss="shadow-Icon-box h-11 border border-Gray-100 dark:border-Gray-800 rounded-2xl px-4 bg-white dark:bg-dark-primary"
                  />
                </div>
                {!isAllowedEveryone && (
                  <div className="bg-Gray-25 dark:bg-dark-primary border-y border-dotted border-Gray-100 dark:border-Gray-800 -mx-4 px-4 py-4">
                    <UsersSelector
                      selectedUsers={allowedUsers}
                      setSelectedUsers={setAllowedUsers}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-Gray-100 dark:border-Gray-800 flex justify-end items-center gap-4 rounded-b-xl">
        {!aiTextChatFeatures?.isEnabled && (
          <button
            className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
            onClick={() => enableOrUpdateService()}
          >
            {t('insights.start-service')}
          </button>
        )}
        {aiTextChatFeatures?.isEnabled && (
          <>
            <button
              className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-white hover:bg-Red-600 border border-Gray-300 rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow"
              onClick={() => stopService()}
            >
              {t('insights.stop-service')}
            </button>
            <button
              className="h-10 px-8 w-auto cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
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
