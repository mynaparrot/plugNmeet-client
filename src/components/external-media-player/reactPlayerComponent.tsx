import React, { useCallback, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { debounce } from 'es-toolkit';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../store';
import { getNatsConn } from '../../helpers/nats';
import {
  IExternalMediaPlayerEvent,
  playerActionEvent,
} from '../../store/slices/externalMediaPlayer';

interface IReactPlayerComponentProps {
  src: string;
  isPresenter: boolean;
}

const ReactPlayerComponent = ({
  src,
  isPresenter,
}: IReactPlayerComponentProps) => {
  const player = useRef<HTMLVideoElement | null>(null);
  const isSeeking = useRef(false);

  const playerEvent = useAppSelector((state) => state.externalMediaPlayer);
  const height = useAppSelector(
    (state) => state.bottomIconsActivity.screenHeight,
  );
  const width = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );

  useEffect(() => {
    if (!player.current || isPresenter) {
      // only for non-presenter to follow presenter
      return;
    }

    switch (playerEvent.action) {
      case 'play':
        if (playerEvent.seekTo && playerEvent.seekTo > 1) {
          player.current.currentTime = playerEvent.seekTo;
        }
        player.current.play().then();
        break;
      case 'pause':
        player.current.pause();
        break;
      case 'seeked':
        if (playerEvent.seekTo) {
          player.current.currentTime = playerEvent.seekTo;
        }
        break;
    }
  }, [playerEvent, isPresenter]);

  const broadcast = useCallback(
    async (action: playerActionEvent) => {
      if (!player.current || !isPresenter) {
        return;
      }

      let msg: IExternalMediaPlayerEvent = {
        action,
      };

      if (action === 'play' || action == 'seeked') {
        msg.seekTo = player.current.currentTime;
      }

      const conn = getNatsConn();
      await conn.sendDataMessage(
        DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS,
        JSON.stringify(msg),
      );
    },
    [isPresenter],
  );

  const onPause = useCallback(async () => {
    if (isSeeking.current) {
      return;
    }
    await broadcast('pause');
  }, [broadcast]);

  const onPlay = useCallback(async () => {
    if (isSeeking.current) {
      return;
    }
    await broadcast('play');
  }, [broadcast]);

  // oxlint-disable-next-line exhaustive-deps
  const onSeeked = useCallback(
    debounce(async () => {
      if (!player.current) return;

      // After seeking, check the player's state.
      if (player.current.paused) {
        // If paused, just send the new position.
        await broadcast('seeked');
      } else {
        // If playing, send the play event to sync position and state.
        await broadcast('play');
      }
      isSeeking.current = false;
    }, 500),
    [broadcast],
  );

  const onSeeking = useCallback(() => {
    isSeeking.current = true;
  }, []);

  const ref = useCallback((_player: HTMLVideoElement) => {
    player.current = _player;
  }, []);

  return (
    <ReactPlayer
      ref={ref}
      src={src}
      width={width * 0.7}
      height={height * 0.7}
      controls={isPresenter}
      onPause={onPause}
      onPlay={onPlay}
      onSeeking={onSeeking}
      onSeeked={onSeeked}
      autoPlay={false}
    />
  );
};

export default ReactPlayerComponent;
