import React, { useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import {
  LocalTrackPublication,
  RemoteTrackPublication,
  Track,
  LocalParticipant,
  RemoteParticipant,
} from 'livekit-client';

import VideoElm from './videoElm';
import AudioElm from './audioElm';
import { RootState, useAppDispatch, useAppSelector } from '../../../../store';
import {
  updateIsActiveParticipantsPanel,
  updateIsActiveScreenshare,
  updateIsActiveSharedNotePad,
} from '../../../../store/slices/bottomIconsActivitySlice';
import VideoElements from '../videos';

interface IScreenShareElementsProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
  screenShareTracks: Map<
    string,
    LocalTrackPublication | RemoteTrackPublication
  >;
}

const isActiveParticipantsPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveParticipantsPanel,
  (isActiveParticipantsPanel) => isActiveParticipantsPanel,
);

const isActiveChatPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveChatPanel,
  (isActiveChatPanel) => isActiveChatPanel,
);

const activateWebcamsViewSelector = createSelector(
  (state: RootState) => state.roomSettings.activateWebcamsView,
  (activateWebcamsView) => activateWebcamsView,
);

const ScreenShareElements = ({
  screenShareTracks,
  videoSubscribers,
}: IScreenShareElementsProps) => {
  const dispatch = useAppDispatch();

  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );
  const isActiveChatPanel = useAppSelector(isActiveChatPanelSelector);
  const activateWebcamsView = useAppSelector(activateWebcamsViewSelector);

  useEffect(() => {
    dispatch(updateIsActiveParticipantsPanel(false));
    dispatch(updateIsActiveSharedNotePad(false));

    return () => {
      // just for double check to make sure we disabled status of screen share
      dispatch(updateIsActiveScreenshare(false));
    };
  }, [dispatch]);

  const render = () => {
    if (screenShareTracks) {
      const elm = Array<JSX.Element>();

      screenShareTracks.forEach((track) => {
        if (track.source === Track.Source.ScreenShare) {
          elm.push(<VideoElm key={track.trackSid} track={track} />);
        } else if (track.source === Track.Source.ScreenShareAudio) {
          elm.push(
            <AudioElm
              key={track.trackSid}
              track={track as RemoteTrackPublication}
            />,
          );
        }
      });

      return elm;
    } else {
      return null;
    }
  };

  // we won't show video elements if both
  // chat & participant panel active
  const shouldShowVideoElems = (): boolean => {
    if (!activateWebcamsView) {
      return false;
    }
    return !(isActiveChatPanel && isActiveParticipantsPanel);
  };

  return (
    <div className="share-screen-wrapper is-share-screen-running">
      {/*{if videoSubscribers has webcams}*/}
      {videoSubscribers && shouldShowVideoElems() ? (
        <VideoElements videoSubscribers={videoSubscribers} perPage={3} />
      ) : null}

      {render()}
    </div>
  );
};

export default React.memo(ScreenShareElements);
