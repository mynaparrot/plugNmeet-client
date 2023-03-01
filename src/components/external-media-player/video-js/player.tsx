import React, { useEffect, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import videojs, { VideoJsPlayer, VideoJsPlayerOptions } from 'video.js';
import 'video.js/dist/video-js.css';

interface IPlayerComponentProps {
  options: VideoJsPlayerOptions;
  onReady: (player: VideoJsPlayer) => void;
}

const PlayerComponent = ({ options, onReady }: IPlayerComponentProps) => {
  const videoRef = React.useRef(null);
  const [player, setPlayer] = useState<VideoJsPlayer>();

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && !player) {
      const player = videojs(videoElement, options, () => {
        onReady && onReady(player);
      });
      setPlayer(player);
    }
    //eslint-disable-next-line
  }, [videoRef]);

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    return () => {
      if (player) {
        player.dispose();
        setPlayer(undefined);
      }
    };
  }, [player]);

  return (
    <div className="react-js-player-wrap">
      <div data-vjs-player>
        <video ref={videoRef} className="video-js" />
      </div>
    </div>
  );
};

export default PlayerComponent;
