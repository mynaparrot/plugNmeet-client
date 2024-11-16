import React, { useEffect, useState, useRef } from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';

import { useAppSelector } from '../../../../store';
import './style.scss';
import { sleep } from '../../../../helpers/utils';
import ConnectionStatus from './connectionStatus';
import MicStatus from './micStatus';
import PinWebcam from './pinWebcam';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
  userId: any;
}

const VideoElm = ({ track, userId }: IVideoElmProps) => {
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

  const fullScreen = async () => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      await document.exitFullscreen();
    }
  };

  const pictureInPicture = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      await sleep(500);
    }
    const el = ref.current;
    if (el) {
      await el.requestPictureInPicture();
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
      <video
        className="camera-video"
        onLoadedData={onLoadedData}
        ref={ref}
        style={{ objectFit: videoFit }}
      />
      <div className="cam-icons w-max h-auto flex items-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999]">
        <PinWebcam userId={userId} />
        <button
          className="cam-fullscreen cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center"
          onClick={fullScreen}
        >
          <i className="icon pnm-fullscreen text[14px] text-white" />
        </button>
        <MicStatus userId={userId} />
        {document.pictureInPictureEnabled ? (
          <button
            className="cam-pip cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center"
            onClick={pictureInPicture}
          >
            <i className="icon pnm-pip text-[14px] text-white" />
          </button>
        ) : null}
        <ConnectionStatus userId={userId} />
      </div>
    </div>
  );
};

export default VideoElm;
