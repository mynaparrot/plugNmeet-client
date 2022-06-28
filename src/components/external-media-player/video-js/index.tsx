import React, { useState, useEffect } from 'react';
import { VideoJsPlayer, VideoJsPlayerOptions } from 'video.js';

import { store } from '../../../store';
import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
} from '../../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from '../../../helpers/websocket';
import PlayerComponent from './player';

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
  const session = store.getState().session;

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
