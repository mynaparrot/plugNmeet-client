import React, { useEffect, useState, useRef } from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import './style.css';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}
const VideoElm = ({ track }: IVideoElmProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState<boolean>();

  useEffect(() => {
    const el = ref.current;

    if (el) {
      track.videoTrack?.attach(el);
    }

    return () => {
      if (el) {
        track.videoTrack?.detach(el);
      }
    };
  }, [track]);

  const onLoadedData = () => {
    console.log('onPlaying');
    setLoaded(true);
  };

  const fullScreen = () => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="screen-share-video relative pb-[calc(100vh-210px)]">
      {!loaded ? (
        <div className="loading flex justify-center">
          <div className="lds-ripple">
            <div></div>
            <div></div>
          </div>
        </div>
      ) : null}
      <button
        className="absolute z-[99] bottom-0 right-0 p-1 bg-black/50"
        onClick={fullScreen}
      >
        <i className="icon pnm-fullscreen text[20px] text-white" />
      </button>
      <video
        onLoadedData={onLoadedData}
        ref={ref}
        className="video-player absolute"
      />
    </div>
  );
};

export default VideoElm;
