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

// @ts-ignore not error
import './style.css';
import { useAppSelector } from '../../../store';
import { LoadingIcon } from '../../../assets/Icons/Loading';

/** Hide spinner even if media events never fire (headless Chrome / MediaStream quirks). */
const LOADED_FALLBACK_MS = 3000;

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}

const VideoElm = ({ track }: IVideoElmProps) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const self = useMemo(() => track instanceof LocalTrackPublication, [track]);

  const markLoaded = useCallback(() => setIsLoaded(true), []);

  useEffect(() => {
    const el = ref.current;
    const videoTrack = track.videoTrack;
    if (!el || !videoTrack) {
      return;
    }

    setIsLoaded(false);
    videoTrack.attach(el);

    const tryMarkLoaded = () => {
      if (
        el.videoWidth > 0 ||
        el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        markLoaded();
        return true;
      }
      return false;
    };

    el.addEventListener('loadeddata', markLoaded);
    el.addEventListener('loadedmetadata', markLoaded);
    el.addEventListener('playing', markLoaded);

    tryMarkLoaded();

    const pollId = window.setInterval(() => {
      if (tryMarkLoaded()) {
        window.clearInterval(pollId);
      }
    }, 200);

    const fallbackId = window.setTimeout(markLoaded, LOADED_FALLBACK_MS);

    return () => {
      el.removeEventListener('loadeddata', markLoaded);
      el.removeEventListener('loadedmetadata', markLoaded);
      el.removeEventListener('playing', markLoaded);
      window.clearInterval(pollId);
      window.clearTimeout(fallbackId);
      videoTrack.detach(el);
    };
  }, [track.videoTrack, markLoaded]);

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
    <div className="screen-share-video group relative w-full h-full overflow-hidden">
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
          className="absolute z-10 bottom-2 end-2 p-1 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={fullScreen}
          aria-label="Fullscreen"
        >
          <i className="icon pnm-fullscreen text-[18px] text-white" />
        </button>
      )}
      <video
        ref={ref}
        className={clsx('video-player absolute w-full h-full', {
          'self-screen-share !w-auto !h-52 !start-1/2 !top-1/2 ltr:!-translate-x-1/2 rtl:!translate-x-1/2 !-translate-y-1/2':
            self,
          'remote-screen-share start-0 top-0': !self,
        })}
      />
      {self && (
        <div className="text-sm 3xl:text-base text-Gray-950 dark:text-white absolute start-1/2 top-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 text-center w-full pt-64">
          {t('notifications.you-are-sharing-screen')}
        </div>
      )}
    </div>
  );
};

export default VideoElm;
