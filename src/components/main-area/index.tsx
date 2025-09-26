import React, { useEffect, useMemo } from 'react';
import { Transition } from '@headlessui/react';

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

const MainArea = () => {
  const dispatch = useAppDispatch();
  const session = store.getState().session;
  const isRecorder = session.currentUser?.isRecorder;
  const roomFeatures = session.currentRoom.metadata?.roomFeatures;

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
    //eslint-disable-next-line
  }, [dispatch]);

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
    isActiveScreenSharingView,
    hasScreenShareSubscribers,
    isActiveWebcamsView,
    hasVideoSubscribers,
    isActiveDisplayExternalLink,
    isActiveExternalMediaPlayer,
    isActiveWhiteboard,
  ]);

  const renderPanel = (
    isActive: boolean,
    panelClass: string,
    Component: React.ElementType,
  ) => (
    <Transition
      show={isActive}
      enter="transition-transform duration-300 ease-in-out"
      enterFrom="translate-x-full"
      enterTo="translate-x-0"
      leave="transition-transform duration-300 ease-in-out"
      leaveFrom="translate-x-0"
      leaveTo="translate-x-full"
    >
      <div
        className={`${panelClass} absolute w-[300px] 3xl:w-[340px] right-0 h-full`}
      >
        <Component />
      </div>
    </Transition>
  );

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
        {renderPanel(
          isActiveParticipantsPanel,
          'participants-panel',
          ParticipantsComponent,
        )}
        {roomFeatures?.chatFeatures?.allowChat &&
          renderPanel(isActiveChatPanel, 'chat-panel', ChatComponent)}
        {roomFeatures?.pollsFeatures?.isAllow &&
          renderPanel(isActivePollsPanel, 'polls-panel', PollsComponent)}
      </div>
    </div>
  );
};

export default MainArea;
