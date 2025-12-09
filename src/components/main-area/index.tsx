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
  const { isRecorder, roomFeatures, aiTextChatFeatures } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    return {
      isRecorder: !!session.currentUser?.isRecorder,
      roomFeatures,
      aiTextChatFeatures:
        roomFeatures?.insightsFeatures?.aiFeatures?.aiTextChatFeatures,
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
    if (!roomFeatures?.chatFeatures?.isAllow) {
      // If chat is not allowed and it's the active panel, close it.
      if (store.getState().bottomIconsActivity.activeSidePanel === 'CHAT') {
        dispatch(setActiveSidePanel(null));
      }
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

    const isSmallScreen = screenWidth < 768;
    const isMediumScreen = screenWidth < 1760;

    if (headerVisible && footerVisible) {
      if (isSmallScreen) {
        return screenHeight - 119.5;
      }
      if (isMediumScreen) {
        return screenHeight - 108;
      }
      return screenHeight - 144;
    } else if (headerVisible) {
      return screenHeight - 68;
    } else if (footerVisible) {
      return screenHeight - 76;
    } else {
      // If both are hidden
      return screenHeight;
    }
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
        {roomFeatures?.chatFeatures?.isAllow && (
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
        {aiTextChatFeatures?.isAllow && (
          <SidePanel
            isActive={activeSidePanel === 'INSIGHTS_AI_TEXT_CHAT'}
            panelClass="insights-ai-text-chat-panel"
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
