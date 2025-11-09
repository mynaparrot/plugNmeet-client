import React, { useCallback, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';

import { useAppSelector } from '../../store';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';
import { getNatsConn } from '../../helpers/nats';

interface IReactPlayerComponentProps {
  src: string;
  action: string;
  seekTo: number;
  isPresenter: boolean;
}

const ReactPlayerComponent = ({
  src,
  action,
  seekTo,
  isPresenter,
}: IReactPlayerComponentProps) => {
  const player = useRef<HTMLVideoElement | null>(null);

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

    if (action === 'play') {
      if (seekTo > 1) {
        player.current.currentTime = seekTo;
      }
      player.current.play().then();
    } else if (action === 'pause') {
      player.current.pause();
    }
  }, [action, seekTo, isPresenter]);

  const broadcast = useCallback(
    async (playing: boolean) => {
      if (!player.current || !isPresenter) {
        return;
      }

      let msg: {};
      if (!playing) {
        msg = {
          action: 'pause',
        };
      } else {
        msg = {
          action: 'play',
          seekTo: player.current.currentTime,
        };
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
    await broadcast(false);
  }, [broadcast]);

  const onPlay = useCallback(async () => {
    await broadcast(true);
  }, [broadcast]);

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
      autoPlay={false}
    />
  );
};

export default ReactPlayerComponent;
