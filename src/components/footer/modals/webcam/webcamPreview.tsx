import React, { useEffect, useRef } from 'react';
import {
  createLocalVideoTrack,
  LocalVideoTrack,
  VideoPresets,
} from 'livekit-client';

import { useAppSelector } from '../../../../store';
import {
  createVirtualBackgroundProcessor,
  TwilioBackgroundProcessor,
} from '../../../../helpers/libs/TrackProcessor';

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
      if (virtualBackground.type !== 'none') {
        processor = createVirtualBackgroundProcessor(virtualBackground);
      }

      createLocalVideoTrack({
        deviceId,
        resolution: VideoPresets.h720.resolution,
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
