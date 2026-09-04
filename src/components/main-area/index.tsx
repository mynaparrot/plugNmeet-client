import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'es-toolkit';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import {
  setActiveSidePanel,
  updateIsEnabledExtendedVerticalCamView,
} from '../../store/slices/bottomIconsActivitySlice';

import { useMainAreaState } from './hooks/useMainAreaState';
import { useMainAreaCustomCSS } from './hooks/useMainAreaCustomCSS';
import { triggerRefreshWhiteboard } from '../../store/slices/whiteboard';
import { updateIsSidePanelOpened } from '../../store/slices/roomSettingsSlice';
import { getMediaServerConn } from '../../helpers/livekit/utils';

import ActiveSpeakers from '../active-speakers';
import MainView from './mainView';
import PollsComponent from '../polls';
import ChatComponent from '../chat';
import ParticipantsComponent from '../participants';
import RoomsPanel from '../breakout-room/roomsPanel';
import SidePanel from './sidePanel';

const MainArea = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const mediaServerConn = getMediaServerConn();

  const { isRecorder, roomFeatures } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    return {
      isRecorder: !!session.currentUser?.isRecorder,
      roomFeatures,
    };
  }, []);

  const showBreakoutRoomsPanel = useAppSelector((state) => {
    const meta = state.session.currentRoom?.metadata;
    return (
      !!meta?.roomFeatures?.breakoutRoomFeatures?.isActive &&
      !meta?.isBreakoutRoom
    );
  });

  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const natsPrevioulyState = useRef<boolean>(isNatsServerConnected);

  const extendedViewPreference = useRef<boolean>(false);

  const {
    columnCameraWidth,
    columnCameraPosition,
    activeSidePanel,
    hasScreenShareSubscribers,
    hasVideoSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
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

  useEffect(() => {
    if (!mediaServerConn) {
      return;
    }

    const publications = Array.from(
      mediaServerConn.room.localParticipant.trackPublications.values(),
    );

    if (!isNatsServerConnected) {
      // NATS has disconnected. Pause all upstream tracks.
      const pausePromises = publications.map((pub) => pub.pauseUpstream());
      Promise.all(pausePromises).then();
    } else if (isNatsServerConnected && !natsPrevioulyState.current) {
      // NATS has reconnected (was previously false, now true). Resume tracks.
      const resumePromises = publications.map((pub) => pub.resumeUpstream());
      Promise.all(resumePromises).then();
    }

    // Update the ref to prepare for the next change.
    natsPrevioulyState.current = isNatsServerConnected;
  }, [isNatsServerConnected, mediaServerConn]);

  const customCSS = useMainAreaCustomCSS({
    hasScreenShareSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isRecorder,
  });

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
      // Save the user's current preference before forcing extended view off,
      // so we can restore it when the panel closes.
      extendedViewPreference.current =
        store.getState().bottomIconsActivity.isEnabledExtendedVerticalCamView;
      dispatch(updateIsEnabledExtendedVerticalCamView(false));
    } else if (
      !anyPanelIsOpen &&
      !isRecorder &&
      extendedViewPreference.current
    ) {
      // Restore extended view only if the screen is wide enough to accommodate
      // the side panel (max 340px) + extended strip (416px) + reasonable content area.
      const screenWidth = store.getState().bottomIconsActivity.screenWidth;
      if (screenWidth >= 1400) {
        dispatch(updateIsEnabledExtendedVerticalCamView(true));
      }
      extendedViewPreference.current = false;
    }
  }, [dispatch, debouncedRefresh, isActiveWhiteboard, isRecorder]);

  const mainAreaClasses = `plugNmeet-app-main-area overflow-hidden relative flex flex-1 w-full ${customCSS} column-camera-width-${columnCameraWidth} column-camera-position-${columnCameraPosition}`;
  const middleAreaClasses = `middle-area relative transition-all duration-300 w-full ${
    activeSidePanel ? 'pb-[300px] md:pb-0 md:pe-[300px] 3xl:pe-[340px]' : ''
  }`;

  return (
    <div id="main-area" className={mainAreaClasses}>
      <div className="inner flex justify-between flex-1">
        <div className={middleAreaClasses}>
          {isNatsServerConnected && (
            <>
              <div className="absolute top-2 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 z-[9999] pointer-events-none w-full [will-change:transform] [backface-visibility:hidden]">
                <ActiveSpeakers activeSidePanel={activeSidePanel} />
              </div>
              <MainView
                isRecorder={isRecorder}
                isActiveWhiteboard={isActiveWhiteboard}
                isActiveExternalMediaPlayer={
                  isActiveExternalMediaPlayer ?? false
                }
                isActiveDisplayExternalLink={
                  isActiveDisplayExternalLink ?? false
                }
                hasScreenShareSubscribers={hasScreenShareSubscribers}
                hasVideoSubscribers={hasVideoSubscribers}
              />
            </>
          )}
        </div>
        <SidePanel
          isActive={activeSidePanel === 'PARTICIPANTS'}
          panelClass="participants-panel"
          ariaLabel={t('left-panel.participants', { total: '' })
            .toString()
            .replace(' ()', '')}
          onToggle={handleSidePanelToggled}
        >
          <ParticipantsComponent />
        </SidePanel>
        {roomFeatures?.chatFeatures?.isAllow && (
          <SidePanel
            isActive={activeSidePanel === 'CHAT'}
            panelClass="chat-panel"
            ariaLabel="Chat panel"
            onToggle={handleSidePanelToggled}
          >
            <ChatComponent />
          </SidePanel>
        )}
        {roomFeatures?.pollsFeatures?.isAllow && (
          <SidePanel
            isActive={activeSidePanel === 'POLLS'}
            panelClass="polls-panel"
            ariaLabel="Polls panel"
            onToggle={handleSidePanelToggled}
          >
            <PollsComponent />
          </SidePanel>
        )}
        {showBreakoutRoomsPanel && (
          <SidePanel
            isActive={activeSidePanel === 'BREAKOUT_ROOMS'}
            panelClass="breakout-rooms-panel"
            ariaLabel={t('breakout-room.rooms-panel-title').toString()}
            onToggle={handleSidePanelToggled}
          >
            <RoomsPanel />
          </SidePanel>
        )}
      </div>
    </div>
  );
};

export default MainArea;
