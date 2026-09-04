import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
import { BreakoutRoomIconSVG } from '../../../../assets/Icons/BreakoutRoomIconSVG';
import { SpeechIconSVG } from '../../../../assets/Icons/SpeechIconSVG';
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';
import { ShareScreenIconSVG } from '../../../../assets/Icons/ShareScreenIconSVG';
import useScreenshare from '../hooks/useScreenshare';
import MenuItemHelper from './menuItemHelper';

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

  const isActiveBreakoutRoomsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.activeSidePanel === 'BREAKOUT_ROOMS',
  );
  const isBreakoutRoomsPanelVisible = useAppSelector((state) => {
    const meta = state.session.currentRoom?.metadata;
    return (
      !!meta?.roomFeatures?.breakoutRoomFeatures?.isActive &&
      !meta?.isBreakoutRoom
    );
  });
  const toggleBreakoutRoomsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('BREAKOUT_ROOMS'));
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
        <MenuItemHelper
          onClick={toggleWhiteboard}
          icon={<WhiteBoardIconSVG />}
          text={
            isActiveWhiteboard
              ? t('footer.icons.hide-whiteboard')
              : t('footer.icons.show-whiteboard')
          }
          isActive={isActiveWhiteboard}
          customClass="md:hidden"
        />
      )}
      {isScreenShareAllowed && !(isMobileOrTablet && !hybrid) && (
        <MenuItemHelper
          onClick={toggleScreenShare}
          icon={<ShareScreenIconSVG classes="w-auto h-4" />}
          text={
            isScreenShareLocked
              ? t('footer.icons.screen-sharing-locked')
              : isActiveShare
                ? t('footer.icons.stop-screen-sharing')
                : t('footer.icons.start-screen-sharing')
          }
          isActive={isActiveShare}
          customClass="md:hidden"
        />
      )}
      {roomFeatures?.sharedNotePadFeatures?.isActive && (
        <MenuItemHelper
          onClick={toggleSharedNotePad}
          icon={<SharedNotepadIconSVG />}
          text={
            isActiveSharedNotePad
              ? t('footer.icons.hide-shared-notepad')
              : t('footer.icons.show-shared-notepad')
          }
          isActive={isActiveSharedNotePad}
          customClass="md:hidden"
        />
      )}
      {isActivePoll && (
        <MenuItemHelper
          onClick={togglePollsPanel}
          icon={<PollsIconSVG classes="" />}
          text={
            isActivePollsPanel
              ? t('footer.icons.hide-polls-panel')
              : t('footer.icons.show-polls-panel')
          }
          isActive={isActivePollsPanel}
          customClass="md:hidden"
        />
      )}
      {isBreakoutRoomsPanelVisible && (
        <MenuItemHelper
          onClick={toggleBreakoutRoomsPanel}
          icon={<BreakoutRoomIconSVG classes="w-auto" />}
          text={
            isActiveBreakoutRoomsPanel
              ? t('footer.icons.hide-breakout-rooms-panel')
              : t('footer.icons.show-breakout-rooms-panel')
          }
          isActive={isActiveBreakoutRoomsPanel}
          customClass="md:hidden"
        />
      )}
      {isEnabledTranscription && (
        <MenuItemHelper
          onClick={toggleSpeechSettingOptionsModal}
          icon={<SpeechIconSVG classes="w-auto" />}
          text={
            isActiveDisplaySpeechSettingOptionsModal
              ? t('footer.icons.hide-translation-settings')
              : t('footer.icons.show-translation-settings')
          }
          isActive={isActiveDisplaySpeechSettingOptionsModal}
          customClass="md:hidden"
        />
      )}
      {isEnabledAiTextChat && (
        <MenuItemHelper
          onClick={toggleAiTextChatPanel}
          icon={<AiIconSVG classes="w-auto" />}
          text={
            isActiveAiTextChat
              ? t('footer.icons.hide-ai-chat-panel')
              : t('footer.icons.show-ai-chat-panel')
          }
          isActive={isActiveAiTextChat}
          customClass="md:hidden"
        />
      )}
    </>
  );
};

export default IconsInMenu;
