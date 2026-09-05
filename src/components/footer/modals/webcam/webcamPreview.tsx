import React, { useEffect, useRef } from 'react';
import { createLocalVideoTrack, LocalVideoTrack } from 'livekit-client';

import { useAppSelector } from '../../../../store';
import {
  createVirtualBackgroundProcessor,
  TwilioBackgroundProcessor,
} from '../../../../helpers/libs/TrackProcessor';
import { getWebcamResolution } from '../../../../helpers/utils';

interface WebcamPreviewProps {
  deviceId: string;
}

const WebcamPreview = ({ deviceId }: WebcamPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoTrack = useRef<LocalVideoTrack | null>(null);

  const virtualBackground = useAppSelector(
    (state) => state.roomSettings.virtualBackground,
  );

  useEffect(() => {
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

  return <video ref={videoRef} className="w-full h-full" autoPlay muted />;
};

export default WebcamPreview;
