import React, { useEffect, useState, useRef } from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';

import { useAppSelector } from '../../../../store';
import './style.css';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
  setVideoRef: React.Dispatch<
    React.SetStateAction<React.RefObject<HTMLVideoElement | null>>
  >;
}

const VideoElm = ({ track, setVideoRef }: IVideoElmProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState<boolean>();

  const roomVideoQuality = useAppSelector(
    (state) => state.roomSettings.roomVideoQuality,
  );
  const videoObjectFit = useAppSelector(
    (state) => state.roomSettings.videoObjectFit,
  );
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const [videoFit, setVideoFit] = useState<any>(videoObjectFit);

  useEffect(() => {
    if (ref.current) {
      setVideoRef(ref);
    }
    //eslint-disable-next-line
  }, [ref]);

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

  return (
    <>
      {!loaded ? (
        <div className="loading absolute text-center top-3 z-999 left-0 right-0 m-auto">
          <div className="lds-ripple">
            <div className="border-secondary-color" />
            <div className="border-secondary-color" />
          </div>
        </div>
      ) : null}
      <video
        className="camera-video"
        onLoadedData={onLoadedData}
        ref={ref}
        style={{ objectFit: videoFit }}
      />
    </>
  );
};

export default VideoElm;
