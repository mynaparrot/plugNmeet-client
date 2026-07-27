import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';

import { useAppSelector } from '../../../../store';
import { LoadingIcon } from '../../../../assets/Icons/Loading';
// @ts-ignore
import './style.css';

/** Hide spinner even if media events never fire (headless Chrome / MediaStream quirks). */
const LOADED_FALLBACK_MS = 3000;

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}

const VideoElm = forwardRef<HTMLVideoElement, IVideoElmProps>(
  ({ track }, fRef) => {
    const ref = useRef<HTMLVideoElement>(null);
    useImperativeHandle(fRef, () => ref.current!, []);

    const roomVideoQuality = useAppSelector(
      (state) => state.roomSettings.roomVideoQuality,
    );
    const videoObjectFit = useAppSelector(
      (state) => state.roomSettings.videoObjectFit,
    );
    const isNatsServerConnected = useAppSelector(
      (state) => state.roomSettings.isNatsServerConnected,
    );

    const videoFit = useMemo(() => {
      return track.trackName === 'canvas' ? 'contain' : videoObjectFit;
    }, [track.trackName, videoObjectFit]);

    const [loaded, setLoaded] = useState(false);
    const markLoaded = useCallback(() => setLoaded(true), []);

    // Attach track and detect first frame via multiple signals.
    // MediaStream + headless Chrome often skips loadeddata; also check
    // loadedmetadata/playing and poll videoWidth as a fallback.
    useEffect(() => {
      const el = ref.current;
      const videoTrack = track.videoTrack;
      if (!el || !videoTrack) {
        return;
      }

      setLoaded(false);
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

      // Already has frames (e.g. re-attach).
      tryMarkLoaded();

      const pollId = window.setInterval(() => {
        if (tryMarkLoaded()) {
          window.clearInterval(pollId);
        }
      }, 200);

      // Last resort: stop showing spinner even if decode never reports dimensions.
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
      if (track instanceof RemoteTrackPublication) {
        track.setVideoQuality(roomVideoQuality);
      }
    }, [roomVideoQuality, track]);

    useEffect(() => {
      const el = ref.current;
      if (!el) {
        return;
      }
      if (!isNatsServerConnected) {
        el.pause();
      } else if (isNatsServerConnected && el.paused) {
        el.play().catch((e) => console.error('video play failed', e.message));
      }
    }, [isNatsServerConnected]);

    return (
      <>
        {!loaded && (
          <div className="loading-status absolute flex h-full w-full items-center justify-center bg-black/50">
            <LoadingIcon
              className="inline h-8 w-8 animate-spin text-gray-200"
              fillColor="#004D90"
            />
          </div>
        )}
        <video
          className="camera-video"
          ref={ref}
          style={{ objectFit: videoFit }}
        />
      </>
    );
  },
);

export default VideoElm;
