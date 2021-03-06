import React, { useEffect, useState } from 'react';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';

import VerticalWebcams from '../main-area/media-elements/vertical-webcams';
import { RootState, useAppDispatch, useAppSelector } from '../../store';
import {
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
} from '../../store/slices/bottomIconsActivitySlice';

interface IDisplayExternalLinkProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const isActiveSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .display_external_link_features.is_active,
  (is_active) => is_active,
);
const linkSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .display_external_link_features.link,
  (url) => url,
);

const DisplayExternalLink = ({
  videoSubscribers,
}: IDisplayExternalLinkProps) => {
  const link = useAppSelector(linkSelector);
  const isActive = useAppSelector(isActiveSelector);
  const dispatch = useAppDispatch();
  const [loaded, setLoaded] = useState<boolean>();

  useEffect(() => {
    dispatch(updateIsActiveChatPanel(false));
    dispatch(updateIsActiveParticipantsPanel(false));
  }, [dispatch]);

  const onLoad = () => {
    setLoaded(true);
  };

  const render = () => {
    if (!link || link === '') {
      return null;
    }
    return (
      <div className="external-display-link-wrapper m-auto h-[calc(100%-50px)] w-full max-w-[1100px] flex-1 sm:px-5 mt-9">
        {!loaded ? (
          <div className="loading absolute left-[50%] top-[40%] flex justify-center">
            <div className="lds-ripple">
              <div className="border-secondaryColor"></div>
              <div className="border-secondaryColor"></div>
            </div>
          </div>
        ) : null}
        <iframe height="100%" width="100%" src={link} onLoad={onLoad} />
      </div>
    );
  };

  return (
    <>
      {isActive ? (
        <div
          className={`middle-fullscreen-wrapper h-full flex ${
            videoSubscribers?.size ? 'verticalsWebcamsActivated' : ''
          }`}
        >
          {/*{if videoSubscribers has webcams}*/}
          <VerticalWebcams videoSubscribers={videoSubscribers} />

          {render()}
        </div>
      ) : null}
    </>
  );
};

export default DisplayExternalLink;
