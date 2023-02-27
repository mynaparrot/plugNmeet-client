import React, { useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { VideoJsPlayer, VideoJsPlayerOptions } from 'video.js';

import { store } from '../../../store';
import { sendWebsocketMessage } from '../../../helpers/websocket';
import PlayerComponent from './player';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../../../helpers/proto/plugnmeet_datamessage_pb';

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
      const dataMsg = new DataMessage({
        type: DataMsgType.SYSTEM,
        roomSid: session.currentRoom.sid,
        roomId: session.currentRoom.room_id,
        body: {
          type: DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS,
          from: {
            sid: session.currentUser?.sid ?? '',
            userId: session.currentUser?.userId ?? '',
          },
          msg,
        },
      });

      sendWebsocketMessage(dataMsg.toBinary());
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
