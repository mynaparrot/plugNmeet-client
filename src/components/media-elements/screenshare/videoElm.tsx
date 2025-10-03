import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import './style.css';
import { useAppSelector } from '../../../store';
import { LoadingIcon } from '../../../assets/Icons/Loading';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}

const VideoElm = ({ track }: IVideoElmProps) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const self = useMemo(() => track instanceof LocalTrackPublication, [track]);

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
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!isNatsServerConnected) {
      el.pause();
    } else if (isNatsServerConnected && el.paused) {
      el.play().catch((e) => console.error('screenshare play failed', e));
    }
  }, [isNatsServerConnected]);

  const onLoadedData = useCallback(() => setIsLoaded(true), []);

  const fullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document
        .exitFullscreen()
        .catch((e) => console.error('exit fullscreen failed', e));
    }
  }, []);

  return (
    <div className="screen-share-video group relative">
      {!isLoaded && (
        <div className="loading-status absolute flex h-full w-full items-center justify-center bg-black/50">
          <LoadingIcon
            className="inline h-10 w-10 animate-spin text-gray-200"
            fillColor="#004D90"
          />
        </div>
      )}
      {isLoaded && (
        <button
          className="absolute z-99 bottom-2 right-2 p-1 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={fullScreen}
        >
          <i className="icon pnm-fullscreen text-[18px] text-white" />
        </button>
      )}
      <video
        onLoadedData={onLoadedData}
        ref={ref}
        className={clsx('video-player absolute', {
          'self-screen-share !w-auto !h-52 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2':
            self,
          'remote-screen-share': !self,
        })}
      />
      {self && (
        <div className="text-sm 3xl:text-base absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full pt-64">
          {t('notifications.you-are-sharing-screen')}
        </div>
      )}
    </div>
  );
};

export default VideoElm;
