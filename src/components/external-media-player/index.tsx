import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { resetExternalMediaPlayer } from '../../store/slices/externalMediaPlayer';
import VideoJsPlayerComponent from './video-js';
import ReactPlayerComponent from './reactPlayerComponent';

const isActiveSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features,
  (external_media_player_features) => external_media_player_features?.is_active,
);
const playBackUrlSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features,
  (external_media_player_features) => external_media_player_features?.url,
);
const actionSelector = createSelector(
  (state: RootState) => state.externalMediaPlayer,
  (externalMediaPlayer) => externalMediaPlayer.action,
);
const seekToSelector = createSelector(
  (state: RootState) => state.externalMediaPlayer,
  (externalMediaPlayer) => externalMediaPlayer.seekTo,
);

const isPresenterSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata,
  (metadata) => metadata?.is_presenter,
);

const ExternalMediaPlayer = () => {
  const playBackUrl = useAppSelector(playBackUrlSelector);
  const isActive = useAppSelector(isActiveSelector);
  const action = useAppSelector(actionSelector);
  const seekTo = useAppSelector(seekToSelector);
  const [showVideoJsPlayer, setShowVideoJsPlayer] = useState<boolean>(false);

  const isPresenter = useAppSelector(isPresenterSelector);
  const dispatch = useAppDispatch();

  const AUDIO_EXTENSIONS =
    /\.(m4a|m4b|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|wav|weba|aac|oga|spx)($|\?)/i;
  const VIDEO_EXTENSIONS = /\.(mp4|og[gv]|webm|mov|m4v)(#t=[,\d+]+)?($|\?)/i;
  const HLS_EXTENSIONS = /\.(m3u8)($|\?)/i;
  const DASH_EXTENSIONS = /\.(mpd)($|\?)/i;

  useEffect(() => {
    if (playBackUrl) {
      dispatch(resetExternalMediaPlayer());
      setShowVideoJsPlayer(
        AUDIO_EXTENSIONS.test(playBackUrl) ||
          VIDEO_EXTENSIONS.test(playBackUrl) ||
          HLS_EXTENSIONS.test(playBackUrl) ||
          DASH_EXTENSIONS.test(playBackUrl),
      );
    }
    //eslint-disable-next-line
  }, [dispatch, playBackUrl]);

  const render = () => {
    return (
      <div className="externalMediaPlayerWrapper m-auto w-full flex items-center justify-center max-w-[1000px] flex-1 p-4">
        <div className="media-player-inner">
          {showVideoJsPlayer ? (
            <VideoJsPlayerComponent
              src={playBackUrl ?? ''}
              action={action}
              isPresenter={!!isPresenter}
              seekTo={seekTo}
            />
          ) : (
            <ReactPlayerComponent
              src={playBackUrl ?? ''}
              action={action}
              isPresenter={!!isPresenter}
              seekTo={seekTo}
            />
          )}
        </div>
      </div>
    );
  };

  return <>{isActive && playBackUrl ? render() : null}</>;
};

export default ExternalMediaPlayer;
