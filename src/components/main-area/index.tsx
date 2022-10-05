import React, { useEffect, useMemo, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Transition } from '@headlessui/react';
import { Room } from 'livekit-client';

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
  currentRoom: Room;
  isRecorder: boolean; // it could be recorder or RTMP bot.
  currentConnection: IConnectLivekit;
}

const isActiveParticipantsPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveParticipantsPanel,
  (isActiveParticipantsPanel) => isActiveParticipantsPanel,
);
const isActiveChatPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveChatPanel,
  (isActiveChatPanel) => isActiveChatPanel,
);
const activeScreenSharingViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activeScreenSharingView,
  (activeScreenSharingView) => activeScreenSharingView,
);
const isActiveSharedNotePadSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveSharedNotePad,
  (isActiveSharedNotePad) => isActiveSharedNotePad,
);
const isActiveWhiteboardSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveWhiteboard,
  (isActiveWhiteboard) => isActiveWhiteboard,
);
const isActiveExternalMediaPlayerSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features.is_active,
  (is_active) => is_active,
);
const isActiveDisplayExternalLinkSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .display_external_link_features.is_active,
  (is_active) => is_active,
);
const screenHeightSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.screenHeight,
  (screenHeight) => screenHeight,
);

const MainArea = ({
  currentRoom,
  isRecorder,
  currentConnection,
}: IMainAreaProps) => {
  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const activeScreenSharingView = useAppSelector(
    activeScreenSharingViewSelector,
  );
  const isActiveSharedNotePad = useAppSelector(isActiveSharedNotePadSelector);
  const isActiveWhiteboard = useAppSelector(isActiveWhiteboardSelector);
  const isActiveExternalMediaPlayer = useAppSelector(
    isActiveExternalMediaPlayerSelector,
  );
  const isActiveDisplayExternalLink = useAppSelector(
    isActiveDisplayExternalLinkSelector,
  );
  const screenHeight = useAppSelector(screenHeightSelector);
  const dispatch = useAppDispatch();
  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);
  const [allowChat, setAllowChat] = useState<boolean>(true);
  const [customCSS, setCustomCSS] = useState<string>();
  const [isActiveScreenShare, setIsActiveScreenShare] =
    useState<boolean>(false);
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

  useEffect(() => {
    const css: Array<string> = [];

    isActiveChatPanel ? css.push('showChatPanel') : css.push('hideChatPanel');
    isActiveParticipantsPanel
      ? css.push('showParticipantsPanel')
      : css.push('hideParticipantsPanel');

    activeScreenSharingView && isActiveScreenShare
      ? css.push('showScreenShare fullWidthMainArea')
      : css.push('hideScreenShare');

    isActiveSharedNotePad
      ? css.push('showSharedNotepad fullWidthMainArea')
      : css.push('hideSharedNotepad');

    isActiveWhiteboard
      ? css.push('showWhiteboard fullWidthMainArea')
      : css.push('hideWhiteboard');

    isActiveExternalMediaPlayer
      ? css.push('showExternalMediaPlayer fullWidthMainArea')
      : css.push('hideExternalMediaPlayer');

    isActiveDisplayExternalLink
      ? css.push('showDisplayExternalLink fullWidthMainArea')
      : css.push('hideDisplayExternalLink');

    setCustomCSS(css.join(' '));
  }, [
    activeScreenSharingView,
    isActiveScreenShare,
    isActiveChatPanel,
    isActiveParticipantsPanel,
    isActiveSharedNotePad,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
  ]);

  const renderLeftPanel = useMemo(() => {
    return (
      <Transition
        className="transition-left-panel"
        show={isActiveParticipantsPanel}
        enter="transform transition duration-[400ms]"
        enterFrom="opacity-0 translate-x-0"
        enterTo="opacity-100"
        leave="transform transition duration-[400ms]"
        leaveFrom="opacity-100"
        leaveTo="opacity-0 -translate-x-full"
      >
        <LeftPanel currentRoom={currentRoom} />
      </Transition>
    );
  }, [isActiveParticipantsPanel, currentRoom]);

  const renderMedialElms = useMemo(() => {
    return (
      <MainComponents
        currentRoom={currentRoom}
        currentConnection={currentConnection}
      />
    );
  }, [currentRoom, currentConnection]);

  const renderRightPanel = useMemo(() => {
    if (allowChat) {
      return (
        <Transition
          className="transition-right-panel"
          show={isActiveChatPanel}
          enter="transform transition duration-[400ms]"
          enterFrom="opacity-0 translate-x-0"
          enterTo="opacity-100"
          leave="transform transition duration-[400ms]"
          leaveFrom="opacity-100"
          leaveTo="opacity-0 translate-x-full"
        >
          <RightPanel currentRoom={currentRoom} isRecorder={isRecorder} />
        </Transition>
      );
    }
    return null;
    //eslint-disable-next-line
  }, [currentRoom, isActiveChatPanel]);

  return (
    <div
      id="main-area"
      className={`plugNmeet-app-main-area overflow-hidden relative flex ${customCSS}`}
      style={
        !isRecorder
          ? { height: `${screenHeight - 110}px` }
          : { height: `${screenHeight}px` }
      }
    >
      <div
        className={`main-app-bg absolute w-full h-full left-0 top-0 object-cover pointer-events-none bg-cover bg-center bg-no-repeat`}
        style={{
          backgroundImage: `url("${assetPath}/imgs/app-banner.jpg")`,
        }}
      />
      <div className="inner flex justify-between w-full">
        {renderLeftPanel}

        <div className="middle-area relative flex-auto">
          <ActiveSpeakers />
          {renderMedialElms}
        </div>

        {renderRightPanel}
      </div>
    </div>
  );
};

export default MainArea;
