import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player/lazy';

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
  const [paused, setPaused] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);
  const player = useRef<ReactPlayer | undefined>(undefined);
  const conn = getNatsConn();

  const height = useAppSelector(
    (state) => state.bottomIconsActivity.screenHeight,
  );
  const width = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );

  useEffect(() => {
    if (isPresenter) {
      return;
    }

    if (action === 'play') {
      setPlaying(true);
    } else if (action === 'pause') {
      setPlaying(false);
    }
  }, [action, isPresenter]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isPresenter && seekTo > 1 && player) {
      player.current?.seekTo(seekTo);
    }
  }, [seekTo, player, isReady, isPresenter]);

  useEffect(() => {
    if (!isPresenter) {
      return;
    }
    if (!isReady || !player) {
      return;
    }
    const broadcast = (msg: string) => {
      conn.sendDataMessage(DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS, msg);
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
  }, [isReady, paused, player, isPresenter]);

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

  return (
    <ReactPlayer
      ref={ref}
      url={src}
      width={width * 0.7}
      height={height * 0.7}
      playing={playing}
      controls={isPresenter}
      onReady={onReady}
      onPause={onPause}
      onPlay={onPlay}
    />
  );
};

export default ReactPlayerComponent;
