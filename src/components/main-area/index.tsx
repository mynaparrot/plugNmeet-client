import React, { useEffect, useMemo, useState } from 'react';
import { Transition } from '@headlessui/react';
import clsx from 'clsx';

import { useAppSelector, useAppDispatch, store } from '../../store';
import {
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../store/slices/bottomIconsActivitySlice';
import { CurrentConnectionEvents } from '../../helpers/livekit/types';
import { getMediaServerConn } from '../../helpers/livekit/utils';

import ActiveSpeakers from '../active-speakers';
import MainComponents from './mainComponents';
import PollsComponent from '../polls';
import ChatComponent from '../chat';
import ParticipantsComponent from '../participants';

const MainArea = () => {
  const columnCameraWidth = useAppSelector(
    (state) => state.roomSettings.columnCameraWidth,
  );
  const columnCameraPosition = useAppSelector(
    (state) => state.roomSettings.columnCameraPosition,
  );
  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveParticipantsPanel,
  );
  const isActiveScreenSharingView = useAppSelector(
    (state) => state.roomSettings.activeScreenSharingView,
  );
  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const isActiveExternalMediaPlayer = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );
  const isActiveDisplayExternalLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveChatPanel,
  );
  const isActivePollsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActivePollsPanel,
  );
  const screenHeight = useAppSelector(
    (state) => state.bottomIconsActivity.screenHeight,
  );
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const headerVisible = useAppSelector(
    (state) => state.roomSettings.visibleHeader,
  );
  const footerVisible = useAppSelector(
    (state) => state.roomSettings.visibleFooter,
  );
  const dispatch = useAppDispatch();
  const currentConnection = getMediaServerConn();
  const session = store.getState().session;
  const isRecorder = session.currentUser?.isRecorder;
  const roomFeatures = session.currentRoom.metadata?.roomFeatures;

  const [isActiveScreenShare, setIsActiveScreenShare] =
    useState<boolean>(false);
  const [height, setHeight] = useState<number>(screenHeight);
  // const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

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

  useEffect(() => {
    setIsActiveScreenShare(currentConnection.screenShareTracksMap.size > 0);
    currentConnection.on(
      CurrentConnectionEvents.ScreenShareStatus,
      setIsActiveScreenShare,
    );
    return () => {
      currentConnection.off(
        CurrentConnectionEvents.ScreenShareStatus,
        setIsActiveScreenShare,
      );
    };
  }, [currentConnection]);

  const customCSS = useMemo(() => {
    const css: Array<string> = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isActiveChatPanel ? css.push('showChatPanel') : css.push('hideChatPanel');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isActiveParticipantsPanel
      ? css.push('showParticipantsPanel')
      : css.push('hideParticipantsPanel');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isActivePollsPanel
      ? css.push('showPollsPanel')
      : css.push('hidePollsPanel');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isActiveScreenSharingView && isActiveScreenShare
      ? css.push('showScreenShare fullWidthMainArea')
      : css.push('hideScreenShare');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isActiveWhiteboard
      ? css.push('showWhiteboard fullWidthMainArea')
      : css.push('hideWhiteboard');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isActiveExternalMediaPlayer
      ? css.push('showExternalMediaPlayer fullWidthMainArea')
      : css.push('hideExternalMediaPlayer');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isActiveDisplayExternalLink
      ? css.push('showDisplayExternalLink fullWidthMainArea')
      : css.push('hideDisplayExternalLink');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isRecorder ? css.push('isRecorder') : null;

    return css.join(' ');
  }, [
    isActiveScreenSharingView,
    isActiveScreenShare,
    isActiveChatPanel,
    isActiveParticipantsPanel,
    isActivePollsPanel,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isRecorder,
  ]);

  const renderMainComponentElms = useMemo(() => {
    return (
      <MainComponents
        isActiveWhiteboard={isActiveWhiteboard}
        isActiveExternalMediaPlayer={isActiveExternalMediaPlayer ?? false}
        isActiveDisplayExternalLink={isActiveDisplayExternalLink ?? false}
        isActiveScreenSharingView={isActiveScreenSharingView}
      />
    );
  }, [
    isActiveScreenSharingView,
    isActiveDisplayExternalLink,
    isActiveExternalMediaPlayer,
    isActiveWhiteboard,
  ]);

  const renderParticipantsPanel = useMemo(() => {
    return (
      <Transition show={isActiveParticipantsPanel}>
        <div
          className={clsx([
            // Base styles
            'participants-panel absolute transition ease-in-out w-[300px] 3xl:w-[340px] right-0 h-full',
            // Shared closed styles
            'data-[closed]:opacity-0',
            // Entering styles
            'data-[enter]:duration-300 data-[enter]:data-[closed]:translate-x-full',
            // Leaving styles
            'data-[leave]:duration-300 data-[leave]:data-[closed]:translate-x-full',
          ])}
        >
          <ParticipantsComponent />
        </div>
      </Transition>
    );
  }, [isActiveParticipantsPanel]);

  const renderChatPanel = useMemo(() => {
    return (
      <Transition show={isActiveChatPanel}>
        <div
          className={clsx([
            // Base styles
            'chat-panel absolute h-full transition ease-in-out w-[300px] 3xl:w-[340px] right-0',
            // Shared closed styles
            'data-[closed]:opacity-0',
            // Entering styles
            'data-[enter]:duration-300 data-[enter]:data-[closed]:translate-x-full',
            // Leaving styles
            'data-[leave]:duration-300 data-[leave]:data-[closed]:translate-x-full',
          ])}
        >
          <ChatComponent />
        </div>
      </Transition>
    );
  }, [isActiveChatPanel]);

  const renderPollsPanel = useMemo(() => {
    return (
      <Transition show={isActivePollsPanel}>
        <div
          className={clsx([
            // Base styles
            'polls-panel absolute h-full transition ease-in-out w-[300px] 3xl:w-[340px] right-0',
            // Shared closed styles
            'data-[closed]:opacity-0',
            // Entering styles
            'data-[enter]:duration-300 data-[enter]:data-[closed]:translate-x-full',
            // Leaving styles
            'data-[leave]:duration-300 data-[leave]:data-[closed]:translate-x-full',
          ])}
        >
          <PollsComponent />
        </div>
      </Transition>
    );
  }, [isActivePollsPanel]);

  useEffect(() => {
    if (isRecorder) {
      setHeight(screenHeight);
      return;
    }
    if (headerVisible && footerVisible) {
      if (screenWidth < 1640) {
        setHeight(screenHeight - 108);
      } else {
        setHeight(screenHeight - 144);
      }
    } else if (headerVisible && !footerVisible) {
      setHeight(screenHeight - 68);
    } else if (!headerVisible && footerVisible) {
      setHeight(screenHeight - 76);
    } else if (!headerVisible && !footerVisible) {
      setHeight(screenHeight);
    }
  }, [screenHeight, screenWidth, isRecorder, headerVisible, footerVisible]);

  return (
    <div
      id="main-area"
      className={`plugNmeet-app-main-area overflow-hidden relative flex w-full ${customCSS} column-camera-width-${columnCameraWidth} column-camera-position-${columnCameraPosition}`}
      style={{ height: `${height}px` }}
    >
      {/* <div
        className={`main-app-bg absolute w-full h-full left-0 top-0 object-cover pointer-events-none bg-cover bg-center bg-no-repeat`}
        style={{
          backgroundImage: `url("${assetPath}/imgs/app-banner.jpg")`,
        }}
      /> */}
      <div className="inner flex justify-between rtl:flex-row-reverse flex-1">
        <div
          className={`middle-area relative transition-all duration-300 w-full ${isActiveParticipantsPanel || isActiveChatPanel || isActivePollsPanel ? 'pr-[300px] 3xl:pr-[340px]' : ''}`}
        >
          <ActiveSpeakers />
          {renderMainComponentElms}
        </div>
        {renderParticipantsPanel}
        {roomFeatures?.chatFeatures?.allowChat ? renderChatPanel : null}
        {roomFeatures?.pollsFeatures?.isAllow ? renderPollsPanel : null}
      </div>
    </div>
  );
};

export default MainArea;
