import React, { useEffect, useState, useRef } from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';

import './style.scss';
import { useAppSelector } from '../../../store';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}

const VideoElm = ({ track }: IVideoElmProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const [loaded, setLoaded] = useState<boolean>(false);
  const [self, setSelf] = useState<boolean>(false);

  useEffect(() => {
    if (track instanceof LocalTrackPublication) {
      setSelf(true);
    }

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

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!isNatsServerConnected) {
      el.pause();
    } else if (isNatsServerConnected && el.paused) {
      el.play().then();
    }
  }, [isNatsServerConnected]);

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
      document.exitFullscreen().then();
    }
  };

  return (
    <div className="screen-share-video relative">
      {!loaded ? (
        <div className="loading flex justify-center">
          <div className="lds-ripple">
            <div className="border-secondaryColor" />
            <div className="border-secondaryColor" />
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
        className={`video-player absolute ${
          self ? 'self-screen-share' : 'remote-screen-share'
        }`}
      />
    </div>
  );
};

export default VideoElm;
