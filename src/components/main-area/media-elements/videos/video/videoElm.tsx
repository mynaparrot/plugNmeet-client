import React, { useEffect, useState, useRef } from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppSelector } from '../../../../../store';
import './style.scss';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}

const roomVideoQualitySelector = createSelector(
  (state: RootState) => state.roomSettings.roomVideoQuality,
  (roomVideoQuality) => roomVideoQuality,
);
const videoObjectFitSelector = createSelector(
  (state: RootState) => state.roomSettings.videoObjectFit,
  (videoObjectFit) => videoObjectFit,
);

const VideoElm = ({ track }: IVideoElmProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState<boolean>();
  const roomVideoQuality = useAppSelector(roomVideoQualitySelector);
  const videoObjectFit = useAppSelector(videoObjectFitSelector);
  const [videoFit, setVideoFit] = useState<any>(videoObjectFit);

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

  useEffect(() => {
    if (track instanceof RemoteTrackPublication) {
      track.setVideoQuality(roomVideoQuality);
    }
  }, [roomVideoQuality, track]);

  useEffect(() => {
    if (track.trackName === 'canvas') {
      setVideoFit('contain');
    } else {
      setVideoFit(videoObjectFit);
    }
  }, [track, videoObjectFit]);

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
            <div className="border-secondaryColor" />
            <div className="border-secondaryColor" />
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
        style={{ objectFit: videoFit }}
      />
    </div>
  );
};

export default VideoElm;
