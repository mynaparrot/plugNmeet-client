import React, { useState, useEffect } from 'react';

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

  const [options] = useState<VideoJsPlayerOptions>({
    controls: isPresenter,
    responsive: true,
    fluid: true,
    sources: [
      {
        src,
      },
    ],
  });

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
    const broadcast = async (msg: string) => {
      conn.sendDataMessage(DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS, msg);
    };

    if (player) {
      player.on('pause', () => {
        const msg = {
          action: 'pause',
        };
        broadcast(JSON.stringify(msg));
      });
      player.on('play', () => {
        const msg = {
          action: 'play',
          seekTo: player.currentTime(),
        };
        broadcast(JSON.stringify(msg));
      });
      player.on('seeked', () => {
        const msg = {
          action: 'seeked',
          seekTo: player.currentTime(),
        };
        broadcast(JSON.stringify(msg));
      });
    }
    //eslint-disable-next-line
  }, [player]);

  const onReady = (player: VideoJsPlayer) => {
    setPlayer(player);
  };

  return <PlayerComponent options={options} onReady={onReady} />;
};

export default VideoJsPlayerComponent;
