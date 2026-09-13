import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createLocalVideoTrack, LocalVideoTrack } from 'livekit-client';

import { useAppSelector } from '../../../../store';
import {
  createVirtualBackgroundProcessor,
  TwilioBackgroundProcessor,
} from '../../../../helpers/libs/TrackProcessor';
import { getWebcamResolution } from '../../../../helpers/utils';

interface WebcamPreviewProps {
  deviceId: string;
  onRetry?: () => void;
}

const WebcamPreview = ({ deviceId, onRetry }: WebcamPreviewProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoTrack = useRef<LocalVideoTrack | null>(null);
  const [failed, setFailed] = useState(false);

  const virtualBackground = useAppSelector(
    (state) => state.roomSettings.virtualBackground,
  );

  useEffect(() => {
    setFailed(false);
    // the track creation is async; if this effect run is cleaned up before
    // the promise resolves (unmount, device switch or StrictMode re-run),
    // the resolved track must be released immediately instead of being kept.
    let disposed = false;

    const startPreview = async () => {
      // stop the previous track before creating a new one.
      const previousTrack = localVideoTrack.current;
      localVideoTrack.current = null;
      if (previousTrack) {
        previousTrack.detach();
        previousTrack.stop();
      }

      if (!deviceId || !videoRef.current) {
        return;
      }

      let processor: TwilioBackgroundProcessor | undefined;
      const resolution = getWebcamResolution();
      if (virtualBackground.type !== 'none') {
        processor = createVirtualBackgroundProcessor(virtualBackground);
        resolution.height = 480;
        resolution.width = 640;
        resolution.frameRate = 24;
        resolution.aspectRatio = undefined;
      }

      try {
        const track = await createLocalVideoTrack({
          deviceId,
          resolution,
          processor,
        });

        if (disposed) {
          // resolved after cleanup: release right away
          track.stop();
          return;
        }

        localVideoTrack.current = track;
        if (videoRef.current) {
          track.attach(videoRef.current);
        }
      } catch (e) {
        console.warn('failed to open webcam preview', e);
        if (!disposed) {
          setFailed(true);
        }
      }
    };

    void startPreview();

    return () => {
      disposed = true;
      if (localVideoTrack.current) {
        localVideoTrack.current.detach();
        localVideoTrack.current.stop();
        localVideoTrack.current = null;
      }
    };
  }, [deviceId, virtualBackground]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-Gray-950 px-4 text-center">
        <p className="text-sm text-white" role="alert">
          {t('footer.modal.cam-preview-failed')}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-8 rounded-lg border border-Gray-500 px-3 text-xs font-semibold text-white hover:bg-Gray-800 focus-ring cursor-pointer"
          >
            {t('footer.modal.mic-retry')}
          </button>
        )}
      </div>
    );
  }

  // Mirrored so the preview matches what others will see disposition-wise
  // and feels natural (same as in-room local tile via videoElm mirrored).
  return (
    <video
      ref={videoRef}
      className="w-full h-full -scale-x-100"
      autoPlay
      muted
      playsInline
    />
  );
};

export default WebcamPreview;
