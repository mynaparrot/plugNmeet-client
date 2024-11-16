import React, { useEffect, useMemo, useState } from 'react';
import { Transition } from '@headlessui/react';
import clsx from 'clsx';

import LeftPanel from '../left-panel';
import RightPanel from '../right-panel';

import { useAppSelector, useAppDispatch, store } from '../../store';
import ActiveSpeakers from '../active-speakers';
import MainComponents from './mainComponents';
import { IRoomMetadata } from '../../store/slices/interfaces/session';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';
import { CurrentConnectionEvents } from '../../helpers/livekit/types';
import { getMediaServerConn } from '../../helpers/livekit/utils';

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
  const screenHeight = useAppSelector(
    (state) => state.bottomIconsActivity.screenHeight,
  );
  const headerVisible = useAppSelector(
    (state) => state.roomSettings.visibleHeader,
  );
  const footerVisible = useAppSelector(
    (state) => state.roomSettings.visibleFooter,
  );
  const dispatch = useAppDispatch();
  const currentConnection = getMediaServerConn();
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  const [allowChat, setAllowChat] = useState<boolean>(true);
  const [isActiveScreenShare, setIsActiveScreenShare] =
    useState<boolean>(false);
  const [height, setHeight] = useState<number>(screenHeight);
  // const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;

    if (!metadata.roomFeatures?.chatFeatures?.allowChat) {
      setAllowChat(false);
      dispatch(updateIsActiveChatPanel(false));
    }
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
    isRecorder ? css.push(`isRecorder`) : null;

    return css.join(' ');
  }, [
    isActiveScreenSharingView,
    isActiveScreenShare,
    isActiveChatPanel,
    isActiveParticipantsPanel,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isRecorder,
  ]);

  const renderLeftPanel = useMemo(() => {
    return (
      <Transition show={isActiveParticipantsPanel}>
        <div
          className={clsx([
            // Base styles
            'participants-panel absolute transition ease-in-out w-[340px] right-0',
            // Shared closed styles
            'data-[closed]:opacity-0',
            // Entering styles
            'data-[enter]:duration-100 data-[enter]:data-[closed]:translate-x-full',
            // Leaving styles
            'data-[leave]:duration-300 data-[leave]:data-[closed]:translate-x-full',
          ])}
        >
          <LeftPanel />
        </div>
      </Transition>
    );
  }, [isActiveParticipantsPanel]);

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

  const renderRightPanel = useMemo(() => {
    if (allowChat) {
      return (
        <Transition show={isActiveChatPanel}>
          <div
            className={clsx([
              // Base styles
              'chat-panel absolute h-full transition ease-in-out w-[350px] right-0',
              // Shared closed styles
              'data-[closed]:opacity-0',
              // Entering styles
              'data-[enter]:duration-100 data-[enter]:data-[closed]:translate-x-full',
              // Leaving styles
              'data-[leave]:duration-300 data-[leave]:data-[closed]:translate-x-full',
            ])}
          >
            <RightPanel />
          </div>
        </Transition>
      );
    }
    return null;
    //eslint-disable-next-line
  }, [currentConnection, isActiveChatPanel]);

  useEffect(() => {
    if (isRecorder) {
      setHeight(screenHeight);
      return;
    }
    if (headerVisible && footerVisible) {
      setHeight(screenHeight - 144);
    } else if (headerVisible && !footerVisible) {
      setHeight(screenHeight - 68);
    } else if (!headerVisible && footerVisible) {
      setHeight(screenHeight - 76);
    } else if (!headerVisible && !footerVisible) {
      setHeight(screenHeight);
    }
  }, [screenHeight, isRecorder, headerVisible, footerVisible]);

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
          className={`middle-area relative transition-all duration-300 w-full ${isActiveParticipantsPanel ? 'pr-[340px]' : ''} ${isActiveChatPanel ? 'pr-[350px]' : ''}`}
        >
          <ActiveSpeakers />
          {renderMainComponentElms}
        </div>
        {renderLeftPanel}
        {renderRightPanel}
      </div>
    </div>
  );
};

export default MainArea;
