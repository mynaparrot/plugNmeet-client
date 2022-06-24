import React, { useEffect, useState, useRef } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import ReactPlayer from 'react-player/lazy';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import VerticalWebcams from '../main-area/media-elements/vertical-webcams';
import { resetExternalMediaPlayer } from '../../store/slices/externalMediaPlayer';
import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
} from '../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from '../../helpers/websocket';
import {
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
} from '../../store/slices/bottomIconsActivitySlice';

interface IExternalMediaPlayerProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const isActiveSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features.is_active,
  (is_active) => is_active,
);
const playBackUrlSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features.url,
  (url) => url,
);
const actionSelector = createSelector(
  (state: RootState) => state.externalMediaPlayer.action,
  (action) => action,
);
const seekToSelector = createSelector(
  (state: RootState) => state.externalMediaPlayer.seekTo,
  (seekTo) => seekTo,
);
const heightSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.screenHeight,
  (screenHeight) => screenHeight,
);
const widthSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.screenWidth,
  (screenWidth) => screenWidth,
);
const isPresenterSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata?.is_presenter,
  (is_presenter) => is_presenter,
);

const ExternalMediaPlayer = ({
  videoSubscribers,
}: IExternalMediaPlayerProps) => {
  const [paused, setPaused] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);

  const playBackUrl = useAppSelector(playBackUrlSelector);
  const isActive = useAppSelector(isActiveSelector);
  const action = useAppSelector(actionSelector);
  const seekTo = useAppSelector(seekToSelector);
  const height = useAppSelector(heightSelector);
  const width = useAppSelector(widthSelector);
  const isPresenter = useAppSelector(isPresenterSelector);
  const dispatch = useAppDispatch();

  const session = store.getState().session;
  const isRecorder = session.currentUser?.isRecorder;
  const player = useRef<ReactPlayer>();

  useEffect(() => {
    if (!isRecorder) {
      dispatch(updateIsActiveChatPanel(false));
      dispatch(updateIsActiveParticipantsPanel(false));
    }
    //eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (playBackUrl) {
      dispatch(resetExternalMediaPlayer());
      setPlaying(false);
    }
  }, [dispatch, playBackUrl]);

  useEffect(() => {
    if (action === 'play') {
      setPlaying(true);
    } else if (action === 'pause') {
      setPlaying(false);
    }
  }, [action]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (seekTo > 1 && player) {
      player.current?.seekTo(seekTo);
    }
  }, [seekTo, player, isReady]);

  useEffect(() => {
    if (!isPresenter) {
      return;
    }
    if (!isReady || !player) {
      return;
    }
    const broadcast = (msg: string) => {
      const data: IDataMessage = {
        type: DataMessageType.SYSTEM,
        room_sid: session.currentRoom.sid,
        message_id: '',
        body: {
          type: SystemMsgType.EXTERNAL_MEDIA_PLAYER_EVENTS,
          from: {
            sid: session.currentUser?.sid ?? '',
            userId: session.currentUser?.userId ?? '',
          },
          msg,
        },
      };
      sendWebsocketMessage(JSON.stringify(data));
    };

    if (paused) {
      const msg = {
        action: 'pause',
      };
      broadcast(JSON.stringify(msg));
    } else {
      const msg = {
        action: 'play',
        seekTo: player.current?.getCurrentTime(),
      };
      broadcast(JSON.stringify(msg));
    }
    //eslint-disable-next-line
  }, [isReady, paused, player]);

  const onReady = () => {
    setIsReady(true);
  };

  const onPause = () => {
    setPaused(true);
  };

  const onPlay = () => {
    setPaused(false);
  };

  const ref = (_player) => {
    player.current = _player;
  };

  const render = () => {
    return (
      <div className="externalMediaPlayerWrapper m-auto w-full flex items-center justify-center max-w-[1000px] flex-1 p-4">
        <div className="media-player-inner">
          <ReactPlayer
            ref={ref}
            url={playBackUrl}
            width={width * 0.7}
            height={height * 0.7}
            playing={playing}
            controls={!!isPresenter}
            onReady={onReady}
            onPause={onPause}
            onPlay={onPlay}
          />
        </div>
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

          {playBackUrl ? render() : null}
        </div>
      ) : null}
    </>
  );
};

export default ExternalMediaPlayer;
