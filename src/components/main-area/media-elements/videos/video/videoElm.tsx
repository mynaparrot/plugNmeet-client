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
    <div className="camera-video-player">
      {!loaded ? (
        <div className="loading absolute text-center top-3 z-[999] left-0 right-0 m-auto">
          <div className="lds-ripple">
            <div className="border-secondaryColor"></div>
            <div className="border-secondaryColor"></div>
          </div>
        </div>
      ) : null}
      <button
        className="absolute z-[999] top-2 right-2 p-1 bg-black/50 w-6 h-6 flex"
        onClick={fullScreen}
      >
        <i className="icon pnm-fullscreen text[14px] text-white" />
      </button>
      <video
        className="camera-video"
        onLoadedData={onLoadedData}
        ref={ref}
        height="200px"
        width="200px"
      />
    </div>
  );
};

export default VideoElm;
