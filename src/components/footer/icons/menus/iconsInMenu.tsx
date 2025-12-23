import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../../store';
import FooterMenuItem from './menuItem';
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

const IconsInMenu = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

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
    // prevent toggling whiteboard during screen sharing
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
    (state) => state.bottomIconsActivity.activeSidePanel === 'PARTICIPANTS',
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

  const isEnabled = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.aiFeatures?.aiTextChatFeatures?.isEnabled,
  );

  const isActiveAiTextChat = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveInsightsAiTextChat,
  );

  const toggleAiTextChatPanel = useCallback(() => {
    dispatch(updateIsActiveInsightsAiTextChat(!isActiveAiTextChat));
  }, [dispatch, isActiveAiTextChat]);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {roomFeatures?.whiteboardFeatures?.isAllow && (
        <FooterMenuItem
          onClick={toggleWhiteboard}
          isActive={isActiveWhiteboard}
          icon={<WhiteBoardIconSVG />}
          text={
            isActiveWhiteboard
              ? t('footer.icons.hide-whiteboard')
              : t('footer.icons.show-whiteboard')
          }
        />
      )}
      {roomFeatures?.sharedNotePadFeatures?.isActive && (
        <FooterMenuItem
          onClick={toggleSharedNotePad}
          isActive={isActiveSharedNotePad}
          icon={<SharedNotepadIconSVG />}
          text={
            isActiveSharedNotePad
              ? t('footer.icons.hide-shared-notepad')
              : t('footer.icons.show-shared-notepad')
          }
        />
      )}
      {isActivePoll && (
        <FooterMenuItem
          onClick={togglePollsPanel}
          isActive={isActivePollsPanel}
          icon={<PollsIconSVG classes="" />}
          text={
            isActivePollsPanel
              ? t('footer.icons.hide-polls-panel')
              : t('footer.icons.show-polls-panel')
          }
        />
      )}
      {isEnabledTranscription && (
        <FooterMenuItem
          onClick={toggleSpeechSettingOptionsModal}
          isActive={isActiveDisplaySpeechSettingOptionsModal}
          icon={<SpeechIconSVG classes="w-auto" />}
          text={
            isActiveDisplaySpeechSettingOptionsModal
              ? t('footer.icons.hide-translation-settings')
              : t('footer.icons.show-translation-settings')
          }
        />
      )}
      <FooterMenuItem
        onClick={toggleAiTextChatPanel}
        isActive={isActiveAiTextChat}
        icon={<AiIconSVG classes="w-auto" />}
        text={
          isActiveAiTextChat
            ? t('footer.icons.hide-ai-chat-panel')
            : t('footer.icons.show-ai-chat-panel')
        }
      />
    </>
  );
};

export default IconsInMenu;
