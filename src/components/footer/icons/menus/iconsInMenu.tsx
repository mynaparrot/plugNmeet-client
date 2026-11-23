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
import { addUserNotification } from '../../../../store/slices/roomSettingsSlice';
import { selectIsInsightsAiTextChatEnabled } from '../../../insights-ai/featureGate';
import { isWorkspaceControlledByAIAgent } from '../../../../helpers/aiAgentSession';
import {
  canAccessBreakoutRooms,
  isAgenticSessionsMode,
} from '../../../breakout-room/utils/breakoutRoom';
import { useGetBreakoutRoomsQuery } from '../../../../store/services/breakoutRoomApi';
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
      roomFeatures: store.getState().session.currentRoom?.metadata?.roomFeatures,
    };
  }, []);

  // While an AI agent runs, the workspace surfaces are automation only.
  const isAiWorkspaceControlled = useAppSelector(isWorkspaceControlledByAIAgent);
  const isPresenter = useAppSelector((state) => !!state.session.currentUser?.metadata?.isPresenter);
  const notifyWorkspaceControlled = useCallback(() => {
    dispatch(
      addUserNotification({
        message: t('ai-agent.notifications.workspace-controlled-by-ai'),
        typeOption: 'warning',
      }),
    );
  }, [dispatch, t]);

  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const isWhiteboardVisibleByPresenter = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible,
  );
  const toggleWhiteboard = useCallback(() => {
    if (store.getState().bottomIconsActivity.isActiveScreenshare) {
      return;
    }
    if (isAiWorkspaceControlled) {
      notifyWorkspaceControlled();
      return;
    }
    if (!isPresenter && isWhiteboardVisibleByPresenter && isActiveWhiteboard) {
      dispatch(
        addUserNotification({
          message: t('footer.notice.whiteboard-in-progress'),
          typeOption: 'warning',
        }),
      );
      return;
    }
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  }, [
    dispatch,
    isActiveWhiteboard,
    isWhiteboardVisibleByPresenter,
    isAiWorkspaceControlled,
    isPresenter,
    notifyWorkspaceControlled,
    t,
  ]);

  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const isSharedNotepadDocked = useAppSelector(
    (state) => state.bottomIconsActivity.isSharedNotepadDocked,
  );
  const activeSidePanel = useAppSelector((state) => state.bottomIconsActivity.activeSidePanel);
  const isNotepadVisibleByPresenter = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.visible,
  );
  // Docked, the pad shares the panel slot, so the item mirrors the panel like Chat does.
  const isNotepadShown =
    isActiveSharedNotePad && (!isSharedNotepadDocked || activeSidePanel === 'SHARED_NOTEPAD');
  const isPresenterPadInProgress = !isPresenter && isNotepadVisibleByPresenter;
  const toggleSharedNotePad = useCallback(() => {
    // An AI-run workspace only drives the side panel slot: room-wide visibility stays with the agent.
    if (isAiWorkspaceControlled) {
      if (!isActiveSharedNotePad) {
        dispatch(updateIsActiveSharedNotePad(true));
      } else {
        dispatch(setActiveSidePanel('SHARED_NOTEPAD'));
      }
      return;
    }
    // Docked, the pad shares the panel slot: reopen it, or let the click fall through
    // to the room-wide visibility request when this user may close the pad.
    if (isSharedNotepadDocked && isActiveSharedNotePad) {
      if (activeSidePanel !== 'SHARED_NOTEPAD' || isPresenterPadInProgress) {
        dispatch(setActiveSidePanel('SHARED_NOTEPAD'));
        return;
      }
    }
    if (isPresenterPadInProgress) {
      dispatch(
        addUserNotification({
          message: t('footer.notice.notepad-in-progress'),
          typeOption: 'warning',
        }),
      );
      return;
    }
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  }, [
    dispatch,
    activeSidePanel,
    isActiveSharedNotePad,
    isPresenterPadInProgress,
    isAiWorkspaceControlled,
    isSharedNotepadDocked,
    t,
  ]);

  const isActivePoll = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
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
  const isBreakoutRoomsPanelVisible = useAppSelector((state) =>
    canAccessBreakoutRooms(
      state.session.currentRoom?.metadata,
      !!state.session.currentUser?.metadata?.isAdmin,
    ),
  );
  const toggleBreakoutRoomsPanel = useCallback(() => {
    dispatch(setActiveSidePanel('BREAKOUT_ROOMS'));
  }, [dispatch]);
  // AI-agent-only rooms label the panel as AI sessions instead of breakout rooms.
  const metadata = useAppSelector((state) => state.session.currentRoom?.metadata);
  const { data: roomsData } = useGetBreakoutRoomsQuery(undefined, {
    skip: !isBreakoutRoomsPanelVisible,
  });
  const isAutoAgentic = isAgenticSessionsMode(metadata, roomsData?.rooms);

  const isActiveDisplaySpeechSettingOptionsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingOptionsModal,
  );
  const isEnabledTranscription = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures?.transcriptionFeatures
        ?.isEnabled,
  );
  const toggleSpeechSettingOptionsModal = useCallback(() => {
    dispatch(updateDisplaySpeechSettingOptionsModal(!isActiveDisplaySpeechSettingOptionsModal));
  }, [dispatch, isActiveDisplaySpeechSettingOptionsModal]);

  const isEnabledAiTextChat = useAppSelector(selectIsInsightsAiTextChatEnabled);
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
          icon={<SharedNotepadIconSVG classes="" />}
          text={
            isNotepadShown
              ? t('footer.icons.hide-shared-notepad')
              : t('footer.icons.show-shared-notepad')
          }
          isActive={isNotepadShown}
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
          // Always the breakout-room glyph: the AI sparkle is reserved for AI Text Chat.
          icon={<BreakoutRoomIconSVG classes="w-auto" />}
          text={
            isAutoAgentic
              ? isActiveBreakoutRoomsPanel
                ? t('footer.icons.hide-ai-sessions-panel')
                : t('footer.icons.show-ai-sessions-panel')
              : isActiveBreakoutRoomsPanel
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
