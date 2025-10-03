import React, { useEffect, useMemo } from 'react';

import { store, useAppDispatch } from '../../store';
import {
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../store/slices/bottomIconsActivitySlice';

import { useMainAreaState } from './hooks/useMainAreaState';
import { useMainAreaCustomCSS } from './hooks/useMainAreaCustomCSS';

import ActiveSpeakers from '../active-speakers';
import MainView from './mainView';
import PollsComponent from '../polls';
import ChatComponent from '../chat';
import ParticipantsComponent from '../participants';
import SidePanel from './sidePanel';

const MainArea = () => {
  const dispatch = useAppDispatch();
  const { isRecorder, roomFeatures } = useMemo(() => {
    const session = store.getState().session;
    return {
      isRecorder: !!session.currentUser?.isRecorder,
      roomFeatures: session.currentRoom.metadata?.roomFeatures,
    };
  }, []);

  const {
    columnCameraWidth,
    columnCameraPosition,
    isActiveParticipantsPanel,
    isActiveScreenSharingView,
    hasScreenShareSubscribers,
    isActiveWebcamsView,
    hasVideoSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isActiveChatPanel,
    isActivePollsPanel,
    screenHeight,
    screenWidth,
    headerVisible,
    footerVisible,
  } = useMainAreaState();

  useEffect(() => {
    if (!roomFeatures?.chatFeatures?.allowChat) {
      dispatch(updateIsActiveChatPanel(false));
    }

    // if not recorder then by default participants panel will open
    if (!isRecorder) {
      dispatch(updateIsActiveParticipantsPanel(true));
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
    isActiveChatPanel,
    isActiveParticipantsPanel,
    isActivePollsPanel,
    isActiveScreenSharingView,
    hasScreenShareSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isRecorder,
  });

  const renderMainComponentElms = useMemo(() => {
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

  const mainAreaClasses = `plugNmeet-app-main-area overflow-hidden relative flex w-full ${customCSS} column-camera-width-${columnCameraWidth} column-camera-position-${columnCameraPosition}`;
  const middleAreaClasses = `middle-area relative transition-all duration-300 w-full ${
    isActiveParticipantsPanel || isActiveChatPanel || isActivePollsPanel
      ? 'pr-[300px] 3xl:pr-[340px]'
      : ''
  }`;

  return (
    <div
      id="main-area"
      className={mainAreaClasses}
      style={{ height: `${height}px` }}
    >
      {/* <div
        className={`main-app-bg absolute w-full h-full left-0 top-0 object-cover pointer-events-none bg-cover bg-center bg-no-repeat`}
        style={{
          backgroundImage: `url("${assetPath}/imgs/app-banner.jpg")`,
        }}
      /> */}
      <div className="inner flex justify-between rtl:flex-row-reverse flex-1">
        <div className={middleAreaClasses}>
          <ActiveSpeakers />
          {renderMainComponentElms}
        </div>
        <SidePanel
          isActive={isActiveParticipantsPanel}
          panelClass="participants-panel"
        >
          <ParticipantsComponent />
        </SidePanel>
        {roomFeatures?.chatFeatures?.allowChat && (
          <SidePanel isActive={isActiveChatPanel} panelClass="chat-panel">
            <ChatComponent />
          </SidePanel>
        )}
        {roomFeatures?.pollsFeatures?.isAllow && (
          <SidePanel isActive={isActivePollsPanel} panelClass="polls-panel">
            <PollsComponent />
          </SidePanel>
        )}
      </div>
    </div>
  );
};

export default MainArea;
