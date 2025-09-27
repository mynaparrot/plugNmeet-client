import React, { useEffect, useState } from 'react';

// @ts-expect-error won't be a problem
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
  }, [player, videoRef, options, onReady]);

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        setPlayer(undefined);
      }
    };
  }, [player]);

  return (
    <div className="react-js-player-wrap">
      <div data-vjs-player>
        <video ref={videoRef} className="video-js" playsInline />
      </div>
    </div>
  );
};

export default PlayerComponent;
