import React, { useEffect, useMemo, useState } from 'react';

// @ts-expect-error won't be a problem
import { VideoJsPlayer, VideoJsPlayerOptions } from 'video.js';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';

import PlayerComponent from './player';
import { getNatsConn } from '../../../helpers/nats';

interface IVideoJsPlayerComponentProps {
  src: string;
  action: string;
  seekTo: number;
  isPresenter: boolean;
}

const VideoJsPlayerComponent = ({
  src,
  action,
  seekTo,
  isPresenter,
}: IVideoJsPlayerComponentProps) => {
  const [player, setPlayer] = useState<VideoJsPlayer>();
  const conn = getNatsConn();

  const options: VideoJsPlayerOptions = useMemo(
    () => ({
      controls: isPresenter,
      responsive: true,
      fluid: false,
      sources: [
        {
          src,
        },
      ],
    }),
    [src, isPresenter],
  );

  useEffect(() => {
    if (isPresenter || !player) {
      return;
    }

    if (action === 'play') {
      player.play();
    } else if (action === 'pause') {
      player.pause();
    }
  }, [action, isPresenter, player]);

  useEffect(() => {
    if (isPresenter || !player) {
      return;
    }

    if (seekTo > 1) {
      player.currentTime(seekTo);
    }
  }, [seekTo, player, isPresenter]);

  useEffect(() => {
    if (!player || !isPresenter) {
      return;
    }

    const broadcast = (msg: string) => {
      conn.sendDataMessage(DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS, msg);
    };

    const onPause = () => {
      const msg = {
        action: 'pause',
      };
      broadcast(JSON.stringify(msg));
    };
    const onPlay = () => {
      const msg = {
        action: 'play',
        seekTo: player.currentTime(),
      };
      broadcast(JSON.stringify(msg));
    };
    const onSeeked = () => {
      const msg = {
        action: 'seeked',
        seekTo: player.currentTime(),
      };
      broadcast(JSON.stringify(msg));
    };

    player.on('pause', onPause);
    player.on('play', onPlay);
    player.on('seeked', onSeeked);

    return () => {
      // player can be disposed already, so check for existence of methods
      player.off?.('pause', onPause);
      player.off?.('play', onPlay);
      player.off?.('seeked', onSeeked);
    };
  }, [player, isPresenter, conn]);

  const onReady = (player: VideoJsPlayer) => {
    setPlayer(player);
  };

  return <PlayerComponent options={options} onReady={onReady} />;
};

export default VideoJsPlayerComponent;
