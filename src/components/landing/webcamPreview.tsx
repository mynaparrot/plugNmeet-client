import React, { useEffect, useRef, useState } from 'react';

import VirtualBackground from '../virtual-background/virtualBackground';
import { useAppSelector } from '../../store';
import { SourcePlayback } from '../virtual-background/helpers/sourceHelper';

interface WebcamPreviewProps {
  selectedVideoDevice: string;
}

const WebcamPreview = ({ selectedVideoDevice }: WebcamPreviewProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const virtualBackground = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );

  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();

  useEffect(() => {
    const el = ref.current;
    if (selectedVideoDevice !== '') {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedVideoDevice,
        },
      };
      navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
        if (el) {
          el.srcObject = mediaStream;
          setSourcePlayback({
            htmlElement: el,
            width: 640,
            height: 480,
          });
        }
      });
    }
    return () => {
      if (el) {
        el.srcObject = null;
      }
    };
  }, [selectedVideoDevice]);

  return (
    <div className="camera bg-Gray-950 rounded-lg overflow-hidden w-full h-64 sm:h-72 3xl:h-80">
      {selectedVideoDevice !== '' && (
        <>
          <div
            className={`${virtualBackground.type !== 'none' ? 'w-0.5 h-0.5' : 'w-full h-full flex'}`}
          >
            <video className="w-full h-full" ref={ref} autoPlay />
          </div>
          {virtualBackground.type !== 'none' && sourcePlayback && (
            <VirtualBackground
              sourcePlayback={sourcePlayback}
              backgroundConfig={virtualBackground}
              id="preview"
            />
          )}
        </>
      )}
    </div>
  );
};

export default WebcamPreview;
