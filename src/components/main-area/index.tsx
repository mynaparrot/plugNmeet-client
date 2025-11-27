import React, { useCallback, useEffect, useMemo } from 'react';
import { debounce } from 'es-toolkit';

import { store, useAppDispatch } from '../../store';
import {
  setActiveSidePanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../store/slices/bottomIconsActivitySlice';

import { useMainAreaState } from './hooks/useMainAreaState';
import { useMainAreaCustomCSS } from './hooks/useMainAreaCustomCSS';
import { triggerRefreshWhiteboard } from '../../store/slices/whiteboard';

import ActiveSpeakers from '../active-speakers';
import MainView from './mainView';
import PollsComponent from '../polls';
import ChatComponent from '../chat';
import ParticipantsComponent from '../participants';
import SidePanel from './sidePanel';
import { updateIsSidePanelOpened } from '../../store/slices/roomSettingsSlice';
import InsightsAiTextChat from '../insights-ai/ai-text-chat/display';

const MainArea = () => {
  const dispatch = useAppDispatch();
  const { isRecorder, roomFeatures, insightsAiFeatures } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    return {
      isRecorder: !!session.currentUser?.isRecorder,
      roomFeatures,
      insightsAiFeatures:
        !!roomFeatures?.insightsFeatures?.isAllow &&
        roomFeatures?.insightsFeatures?.aiFeatures,
    };
  }, []);

  const {
    columnCameraWidth,
    columnCameraPosition,
    activeSidePanel,
    isActiveScreenSharingView,
    hasScreenShareSubscribers,
    isActiveWebcamsView,
    hasVideoSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    screenHeight,
    screenWidth,
    headerVisible,
    footerVisible,
  } = useMainAreaState();

  useEffect(() => {
    if (!roomFeatures?.chatFeatures?.allowChat) {
      // If chat is not allowed and it's the active panel, close it.
      if (store.getState().bottomIconsActivity.activeSidePanel === 'CHAT') {
        dispatch(setActiveSidePanel(null));
      }
    }

    // if not recorder then by default participants panel will open
    if (!isRecorder) {
      dispatch(setActiveSidePanel('PARTICIPANTS'));
    }
    // if recorder then webcam always has extended view
    if (isRecorder) {
      dispatch(updateIsEnabledExtendedVerticalCamView(true));
    }

    // ask for notification permission
    // we'll not bother if permission was rejected before
    if (
      !isRecorder &&
      'Notification' in window &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission().then();
    }
  }, [dispatch, isRecorder, roomFeatures]);

  const customCSS = useMainAreaCustomCSS({
    activeSidePanel: activeSidePanel !== null,
    isActiveScreenSharingView,
    hasScreenShareSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isRecorder,
  });

  const renderMainView = useMemo(() => {
    return (
      <MainView
        isRecorder={isRecorder}
        isActiveWhiteboard={isActiveWhiteboard}
        isActiveExternalMediaPlayer={isActiveExternalMediaPlayer ?? false}
        isActiveDisplayExternalLink={isActiveDisplayExternalLink ?? false}
        isActiveScreenSharingView={isActiveScreenSharingView}
        hasScreenShareSubscribers={hasScreenShareSubscribers}
        isActiveWebcamsView={isActiveWebcamsView}
        hasVideoSubscribers={hasVideoSubscribers}
      />
    );
  }, [
    isRecorder,
    isActiveScreenSharingView,
    hasScreenShareSubscribers,
    isActiveWebcamsView,
    hasVideoSubscribers,
    isActiveDisplayExternalLink,
    isActiveExternalMediaPlayer,
    isActiveWhiteboard,
  ]);

  const height = useMemo(() => {
    if (isRecorder) {
      return screenHeight;
    }
    if (headerVisible && footerVisible) {
      return screenWidth < 1640 ? screenHeight - 108 : screenHeight - 144;
    } else if (headerVisible && !footerVisible) {
      return screenHeight - 68;
    } else if (!headerVisible && footerVisible) {
      return screenHeight - 76;
    }
    // if both are hidden
    return screenHeight;
  }, [screenHeight, screenWidth, isRecorder, headerVisible, footerVisible]);

  const debouncedRefresh = useMemo(
    () =>
      debounce(() => {
        dispatch(triggerRefreshWhiteboard());
      }, 500),
    [dispatch],
  );

  const handleSidePanelToggled = useCallback(() => {
    // This logic can be simplified now.
    // We just need to know if *any* panel is open.
    const anyPanelIsOpen =
      store.getState().bottomIconsActivity.activeSidePanel !== null;
    dispatch(updateIsSidePanelOpened(anyPanelIsOpen));

    if (isActiveWhiteboard) {
      debouncedRefresh();
    }

    if (anyPanelIsOpen && !isRecorder) {
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    }
  }, [dispatch, debouncedRefresh, isActiveWhiteboard, isRecorder]);

  const mainAreaClasses = `plugNmeet-app-main-area overflow-hidden relative flex w-full ${customCSS} column-camera-width-${columnCameraWidth} column-camera-position-${columnCameraPosition}`;
  const middleAreaClasses = `middle-area relative transition-all duration-300 w-full ${
    activeSidePanel ? 'pb-[300px] md:pb-0 md:pr-[300px] 3xl:pr-[340px]' : ''
  }`;

  return (
    <div
      id="main-area"
      className={mainAreaClasses}
      style={{ height: `${height}px` }}
    >
      <div className="inner flex justify-between rtl:flex-row-reverse flex-1">
        <div className={middleAreaClasses}>
          <ActiveSpeakers />
          {renderMainView}
        </div>
        <SidePanel
          isActive={activeSidePanel === 'PARTICIPANTS'}
          panelClass="participants-panel"
          onToggle={handleSidePanelToggled}
        >
          <ParticipantsComponent />
        </SidePanel>
        {roomFeatures?.chatFeatures?.allowChat && (
          <SidePanel
            isActive={activeSidePanel === 'CHAT'}
            panelClass="chat-panel"
            onToggle={handleSidePanelToggled}
          >
            <ChatComponent />
          </SidePanel>
        )}
        {roomFeatures?.pollsFeatures?.isAllow && (
          <SidePanel
            isActive={activeSidePanel === 'POLLS'}
            panelClass="polls-panel"
            onToggle={handleSidePanelToggled}
          >
            <PollsComponent />
          </SidePanel>
        )}
        {insightsAiFeatures &&
          insightsAiFeatures.isAllow &&
          insightsAiFeatures.aiTextChatFeatures?.isEnabled && (
            <SidePanel
              isActive={activeSidePanel === 'INSIGHTS_AI_TEXT_CHAT'}
              panelClass="insights-ai-panel"
              onToggle={handleSidePanelToggled}
            >
              <InsightsAiTextChat />
            </SidePanel>
          )}
      </div>
    </div>
  );
};

export default MainArea;
