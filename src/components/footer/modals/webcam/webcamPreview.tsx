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
    (state) => state.bottomIconsActivity.virtualBackground,
  );

  useEffect(() => {
    if (deviceId && videoRef.current) {
      // stop the previous track before creating a new one
      if (localVideoTrack.current) {
        localVideoTrack.current.detach();
        localVideoTrack.current.stop();
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

      createLocalVideoTrack({
        deviceId,
        resolution,
        processor,
      }).then((track) => {
        localVideoTrack.current = track;
        if (videoRef.current) {
          localVideoTrack.current.attach(videoRef.current);
        }
      });
    }

    return () => {
      // stop track on component unmount
      if (localVideoTrack.current) {
        localVideoTrack.current.stopProcessor(false).then(() => {
          localVideoTrack.current?.detach();
          localVideoTrack.current?.stop();
        });
      }
    };
  }, [deviceId, virtualBackground]);

  useEffect(() => {
    return () => {
      if (localVideoTrack.current) {
        localVideoTrack.current.stopProcessor(false).then(() => {
          localVideoTrack.current?.detach();
          localVideoTrack.current?.stop();
        });
      }
    };
  }, []);

  return <video ref={videoRef} className="w-full h-full" autoPlay muted />;
};

export default WebcamPreview;
