import React, { useEffect, useRef, useState } from 'react';
import {
  createLocalVideoTrack,
  LocalVideoTrack,
  VideoPresets,
} from 'livekit-client';

import { useAppSelector } from '../../store';
import {
  createVirtualBackgroundProcessor,
  TwilioBackgroundProcessor,
} from '../../helpers/libs/TrackProcessor';

interface WebcamPreviewProps {
  selectedVideoDevice: string;
}

const WebcamPreview = ({ selectedVideoDevice }: WebcamPreviewProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const virtualBackground = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack>();

  useEffect(() => {
    if (selectedVideoDevice && ref.current) {
      // stop previous track before creating a new one
      if (videoTrack) {
        videoTrack.detach();
        videoTrack.stop();
      }

      let processor: TwilioBackgroundProcessor | undefined;
      if (virtualBackground.type !== 'none') {
        processor = createVirtualBackgroundProcessor(virtualBackground);
      }

      createLocalVideoTrack({
        deviceId: selectedVideoDevice,
        resolution: VideoPresets.h720.resolution,
        processor,
      }).then((track) => {
        setVideoTrack(track);
        if (ref.current) {
          track.attach(ref.current);
        }
      });
    }

    return () => {
      // stop track on component unmount
      if (videoTrack) {
        videoTrack.detach();
        videoTrack.stop();
      }
    };
    //eslint-disable-next-line
  }, [selectedVideoDevice, virtualBackground]);

  return (
    <div className="camera bg-Gray-950 rounded-lg overflow-hidden w-full h-56 sm:h-72 3xl:h-80">
      {selectedVideoDevice !== '' && (
        <video className="w-full h-full" ref={ref} autoPlay muted />
      )}
    </div>
  );
};

export default WebcamPreview;
