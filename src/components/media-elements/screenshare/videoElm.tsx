import React, { useEffect, useState, useRef } from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import { useTranslation } from 'react-i18next';

import './style.css';
import { useAppSelector } from '../../../store';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}

const VideoElm = ({ track }: IVideoElmProps) => {
  const { t } = useTranslation();
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
        <div className="loading absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center">
          <div className="lds-ripple">
            <div className="border-secondary-color" />
            <div className="border-secondary-color" />
          </div>
        </div>
      ) : null}
      <button
        className="absolute z-99 bottom-0 right-0 p-1 bg-black/50"
        onClick={fullScreen}
      >
        <i className="icon pnm-fullscreen text[20px] text-white" />
      </button>
      <video
        onLoadedData={onLoadedData}
        ref={ref}
        className={`video-player absolute ${
          self
            ? 'self-screen-share !w-auto !h-52 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2'
            : 'remote-screen-share'
        }`}
      />
      {self ? (
        <>
          <div className="text absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full pt-64">
            {t('notifications.you-are-sharing-screen')}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default VideoElm;
