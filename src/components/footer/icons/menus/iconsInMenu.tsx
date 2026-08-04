import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuItem } from '@headlessui/react';

import { store, useAppDispatch, useAppSelector } from '../../../../store';
import {
  setActiveSidePanel,
  updateDisplaySpeechSettingOptionsModal,
  updateIsActiveInsightsAiTextChat,
  updateIsActiveSharedNotePad,
  updateIsActiveWhiteboard,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { WhiteBoardIconSVG } from '../../../../assets/Icons/WhiteBoardIconSVG';
import { SharedNotepadIconSVG } from '../../../../assets/Icons/SharedNotepadIconSVG';
import { PollsIconSVG } from '../../../../assets/Icons/PollsIconSVG';
import { SpeechIconSVG } from '../../../../assets/Icons/SpeechIconSVG';
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';
import { ShareScreenIconSVG } from '../../../../assets/Icons/ShareScreenIconSVG';
import useScreenshare from '../hooks/useScreenshare';

const IconsInMenu = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    isScreenShareAllowed,
    isMobileOrTablet,
    hybrid,
    isActiveShare,
    isLocked: isScreenShareLocked,
    toggleScreenShare,
  } = useScreenshare();

  const { roomFeatures } = useMemo(() => {
    return {
      roomFeatures:
        store.getState().session.currentRoom?.metadata?.roomFeatures,
    };
  }, []);

  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const toggleWhiteboard = useCallback(() => {
    if (store.getState().bottomIconsActivity.isActiveScreenshare) {
      return;
    }
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  }, [dispatch, isActiveWhiteboard]);

  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const toggleSharedNotePad = useCallback(() => {
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  }, [dispatch, isActiveSharedNotePad]);

  const isActivePoll = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
  );
  const isActivePollsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.activeSidePanel === 'POLLS',
  );
  const togglePollsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('POLLS'));
  }, [dispatch]);

  const isActiveDisplaySpeechSettingOptionsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingOptionsModal,
  );
  const isEnabledTranscription = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.transcriptionFeatures?.isEnabled,
  );
  const toggleSpeechSettingOptionsModal = useCallback(() => {
    dispatch(
      updateDisplaySpeechSettingOptionsModal(
        !isActiveDisplaySpeechSettingOptionsModal,
      ),
    );
  }, [dispatch, isActiveDisplaySpeechSettingOptionsModal]);

  const isEnabledAiTextChat = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures?.isEnabled,
  );
  const isActiveAiTextChat = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveInsightsAiTextChat,
  );
  const toggleAiTextChatPanel = useCallback(() => {
    dispatch(updateIsActiveInsightsAiTextChat(!isActiveAiTextChat));
  }, [dispatch, isActiveAiTextChat]);

  return (
    <>
      {roomFeatures?.whiteboardFeatures?.isAllow && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleWhiteboard}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <WhiteBoardIconSVG />
            </span>
            {isActiveWhiteboard
              ? t('footer.icons.hide-whiteboard')
              : t('footer.icons.show-whiteboard')}
            {isActiveWhiteboard && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {isScreenShareAllowed && !(isMobileOrTablet && !hybrid) && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleScreenShare}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <ShareScreenIconSVG classes="w-auto h-4" />
            </span>
            {isScreenShareLocked
              ? t('footer.icons.screen-sharing-locked')
              : isActiveShare
                ? t('footer.icons.stop-screen-sharing')
                : t('footer.icons.start-screen-sharing')}
            {isActiveShare && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {roomFeatures?.sharedNotePadFeatures?.isActive && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleSharedNotePad}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <SharedNotepadIconSVG />
            </span>
            {isActiveSharedNotePad
              ? t('footer.icons.hide-shared-notepad')
              : t('footer.icons.show-shared-notepad')}
            {isActiveSharedNotePad && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {isActivePoll && (
        <MenuItem>
          <button
            type="button"
            onClick={togglePollsPanel}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <PollsIconSVG classes="" />
            </span>
            {isActivePollsPanel
              ? t('footer.icons.hide-polls-panel')
              : t('footer.icons.show-polls-panel')}
            {isActivePollsPanel && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {isEnabledTranscription && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleSpeechSettingOptionsModal}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <SpeechIconSVG classes="w-auto" />
            </span>
            {isActiveDisplaySpeechSettingOptionsModal
              ? t('footer.icons.hide-translation-settings')
              : t('footer.icons.show-translation-settings')}
            {isActiveDisplaySpeechSettingOptionsModal && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {isEnabledAiTextChat && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleAiTextChatPanel}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <AiIconSVG classes="w-auto" />
            </span>
            {isActiveAiTextChat
              ? t('footer.icons.hide-ai-chat-panel')
              : t('footer.icons.show-ai-chat-panel')}
            {isActiveAiTextChat && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
    </>
  );
};

export default IconsInMenu;
