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
import './style.css';

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

    const [loaded, setLoaded] = useState<boolean>();
    const onLoadedData = useCallback(() => setLoaded(true), []);

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
          onLoadedData={onLoadedData}
          ref={ref}
          style={{ objectFit: videoFit }}
        />
      </>
    );
  },
);

export default VideoElm;
