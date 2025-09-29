import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { resetExternalMediaPlayer } from '../../store/slices/externalMediaPlayer';
import VideoJsPlayerComponent from './video-js';
import ReactPlayerComponent from './reactPlayerComponent';

const ExternalMediaPlayer = () => {
  const playBackUrl = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.url,
  );
  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );
  const action = useAppSelector((state) => state.externalMediaPlayer.action);
  const seekTo = useAppSelector((state) => state.externalMediaPlayer.seekTo);
  const [showVideoJsPlayer, setShowVideoJsPlayer] = useState<boolean>(false);

  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );
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

  return (
    isActive &&
    playBackUrl && (
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
    )
  );
};

export default ExternalMediaPlayer;
