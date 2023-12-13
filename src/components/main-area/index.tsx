import React, { useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Transition } from '@headlessui/react';

import LeftPanel from '../left-panel';
import RightPanel from '../right-panel';

import { useAppSelector, RootState, store, useAppDispatch } from '../../store';
import ActiveSpeakers from '../active-speakers';
import MainComponents from './mainComponents';
import { IRoomMetadata } from '../../store/slices/interfaces/session';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';
import {
  CurrentConnectionEvents,
  IConnectLivekit,
} from '../../helpers/livekit/types';

interface IMainAreaProps {
  isRecorder: boolean; // it could be recorder or RTMP bot.
  currentConnection: IConnectLivekit;
}

const columnCameraWidthSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.columnCameraWidth,
);
const columnCameraPositionSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.columnCameraPosition,
);
const isActiveParticipantsPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveParticipantsPanel,
);
const isActiveChatPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveChatPanel,
);
const activeScreenSharingViewSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.activeScreenSharingView,
);
const isActiveWhiteboardSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveWhiteboard,
);
const isActiveExternalMediaPlayerSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features,
  (external_media_player_features) => external_media_player_features?.is_active,
);
const isActiveDisplayExternalLinkSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .display_external_link_features,
  (display_external_link_features) => display_external_link_features?.is_active,
);
const screenHeightSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.screenHeight,
);
const headerVisibilitySelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.visibleHeader,
);
const footerVisibilitySelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.visibleFooter,
);

const MainArea = ({ isRecorder, currentConnection }: IMainAreaProps) => {
  const columnCameraWidth = useAppSelector(columnCameraWidthSelector);
  const columnCameraPosition = useAppSelector(columnCameraPositionSelector);
  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const isActiveScreenSharingView = useAppSelector(
    activeScreenSharingViewSelector,
  );
  const isActiveWhiteboard = useAppSelector(isActiveWhiteboardSelector);
  const isActiveExternalMediaPlayer = useAppSelector(
    isActiveExternalMediaPlayerSelector,
  );
  const isActiveDisplayExternalLink = useAppSelector(
    isActiveDisplayExternalLinkSelector,
  );
  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);
  const screenHeight = useAppSelector(screenHeightSelector);
  const headerVisible = useAppSelector(headerVisibilitySelector);
  const footerVisible = useAppSelector(footerVisibilitySelector);
  const dispatch = useAppDispatch();

  const [allowChat, setAllowChat] = useState<boolean>(true);
  const [isActiveScreenShare, setIsActiveScreenShare] =
    useState<boolean>(false);
  const [height, setHeight] = useState<number>(screenHeight);
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;

    if (!metadata.room_features?.chat_features.allow_chat) {
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

    isActiveChatPanel ? css.push('showChatPanel') : css.push('hideChatPanel');
    isActiveParticipantsPanel
      ? css.push('showParticipantsPanel')
      : css.push('hideParticipantsPanel');

    isActiveScreenSharingView && isActiveScreenShare
      ? css.push('showScreenShare fullWidthMainArea')
      : css.push('hideScreenShare');

    isActiveWhiteboard
      ? css.push('showWhiteboard fullWidthMainArea')
      : css.push('hideWhiteboard');

    isActiveExternalMediaPlayer
      ? css.push('showExternalMediaPlayer fullWidthMainArea')
      : css.push('hideExternalMediaPlayer');

    isActiveDisplayExternalLink
      ? css.push('showDisplayExternalLink fullWidthMainArea')
      : css.push('hideDisplayExternalLink');

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
      <Transition
        className="transition-left-panel"
        show={isActiveParticipantsPanel}
        unmount={false}
        enter="transform transition duration-[400ms]"
        enterFrom="opacity-0 translate-x-0"
        enterTo="opacity-100"
        leave="transform transition duration-[400ms]"
        leaveFrom="opacity-100"
        leaveTo="opacity-0 -translate-x-full"
      >
        <LeftPanel />
      </Transition>
    );
  }, [isActiveParticipantsPanel]);

  const renderMainComponentElms = useMemo(() => {
    return (
      <MainComponents
        currentConnection={currentConnection}
        isActiveWhiteboard={isActiveWhiteboard}
        isActiveExternalMediaPlayer={isActiveExternalMediaPlayer ?? false}
        isActiveDisplayExternalLink={isActiveDisplayExternalLink ?? false}
        isActiveScreenSharingView={isActiveScreenSharingView}
      />
    );
  }, [
    isActiveScreenSharingView,
    currentConnection,
    isActiveDisplayExternalLink,
    isActiveExternalMediaPlayer,
    isActiveWhiteboard,
  ]);

  const renderRightPanel = useMemo(() => {
    if (allowChat) {
      return (
        <Transition
          className="transition-right-panel"
          show={isActiveChatPanel}
          unmount={false}
          enter="transform transition duration-[400ms]"
          enterFrom="opacity-0 translate-x-0"
          enterTo="opacity-100"
          leave="transform transition duration-[400ms]"
          leaveFrom="opacity-100"
          leaveTo="opacity-0 translate-x-full"
        >
          <RightPanel
            currentRoom={currentConnection.room}
            isRecorder={isRecorder}
          />
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
      setHeight(screenHeight - 110);
    } else if (headerVisible && !footerVisible) {
      setHeight(screenHeight - 50);
    } else if (!headerVisible && footerVisible) {
      setHeight(screenHeight - 60);
    } else if (!headerVisible && !footerVisible) {
      setHeight(screenHeight);
    }
  }, [screenHeight, isRecorder, headerVisible, footerVisible]);

  return (
    <div
      id="main-area"
      className={`plugNmeet-app-main-area overflow-hidden relative flex ${customCSS} column-camera-width-${columnCameraWidth} column-camera-position-${columnCameraPosition}`}
      style={{ height: `${height}px` }}
    >
      <div
        className={`main-app-bg absolute w-full h-full left-0 top-0 object-cover pointer-events-none bg-cover bg-center bg-no-repeat`}
        style={{
          backgroundImage: `url("${assetPath}/imgs/app-banner.jpg")`,
        }}
      />
      <div className="inner flex justify-between w-full rtl:flex-row-reverse">
        {renderLeftPanel}

        <div className="middle-area relative flex-auto">
          <ActiveSpeakers />
          {renderMainComponentElms}
        </div>

        {renderRightPanel}
      </div>
    </div>
  );
};

export default MainArea;
