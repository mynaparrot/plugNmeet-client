import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Transition } from '@headlessui/react';
import {
  LocalParticipant,
  Room,
  RemoteParticipant,
  LocalTrackPublication,
  RemoteTrackPublication,
} from 'livekit-client';

import LeftPanel from '../left-panel';
import RightPanel from '../right-panel';

import { useAppSelector, RootState, store, useAppDispatch } from '../../store';
import ActiveSpeakers from './active-speakers';
import MediaElementsComponent from './media-elements';
import { IRoomMetadata } from '../../store/slices/interfaces/session';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';

interface IMainAreaProps {
  currentRoom: Room;
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  audioSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  screenShareTracks?: Map<
    string,
    LocalTrackPublication | RemoteTrackPublication
  >;
  isRecorder: boolean; // it could be recorder or RTMP bot.
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

const MainArea = ({
  currentRoom,
  audioSubscribers,
  videoSubscribers,
  screenShareTracks,
  isRecorder,
}: IMainAreaProps) => {
  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const activeScreenSharingView = useAppSelector(
    activeScreenSharingViewSelector,
  );
  const isActiveSharedNotePad = useAppSelector(isActiveSharedNotePadSelector);
  const isActiveWhiteboard = useAppSelector(isActiveWhiteboardSelector);
  const dispatch = useAppDispatch();
  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);
  const [allowChat, setAllowChat] = useState<boolean>(true);
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;

    if (!metadata.room_features?.chat_features.allow_chat) {
      setAllowChat(false);
      dispatch(updateIsActiveChatPanel(false));
    }
  }, [dispatch]);

  return (
    <div
      id="main-area"
      className={`${
        !isRecorder ? 'lg:h-[calc(100vh-110px)]' : 'h-[calc(100vh)] isRecorder'
      }  plugNmeet-app-main-area overflow-hidden relative flex ${
        !isActiveChatPanel ? 'hideChatPanel' : 'showChatPanel'
      } ${
        !isActiveParticipantsPanel
          ? 'hideParticipantsPanel'
          : 'showParticipantsPanel'
      } ${
        screenShareTracks?.size && activeScreenSharingView
          ? 'showScreenShare'
          : 'hideScreenShare'
      }
      ${isActiveSharedNotePad ? 'showSharedNotepad' : 'hideSharedNotepad'}
      ${isActiveWhiteboard ? 'showWhiteboard' : 'hideWhiteboard'}
      `}
    >
      <img
        className="absolute w-full h-full left-0 top-0 object-cover pointer-events-none"
        src={`${assetPath}/imgs/app-banner.jpg`}
        alt="AppBG"
      />
      <div className="inner flex justify-between w-full">
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
          <LeftPanel />
        </Transition>

        <div className="middle-area relative flex-auto">
          <ActiveSpeakers />
          <MediaElementsComponent
            currentRoom={currentRoom}
            audioSubscribers={audioSubscribers}
            videoSubscribers={videoSubscribers}
            screenShareTracks={screenShareTracks}
          />
        </div>

        {allowChat ? (
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
        ) : null}
      </div>
    </div>
  );
};

export default MainArea;
