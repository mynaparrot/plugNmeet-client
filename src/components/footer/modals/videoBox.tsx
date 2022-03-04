import React, { useRef, useEffect, SyntheticEvent } from 'react';
import { SourcePlayback } from '../../virtual-background/helpers/sourceHelper';

interface IVideoBoxProps {
  deviceId: string;
  onLoad: (sourcePlayback: SourcePlayback) => void;
}
const VideoBox = ({ deviceId, onLoad }: IVideoBoxProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    let ms: MediaStream;
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId,
      },
    };
    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      if (el) {
        ms = mediaStream;
        el.srcObject = mediaStream;
      }
    });
    return () => {
      if (el) {
        el.pause();
        el.removeAttribute('src'); // empty source
      }
      if (ms) {
        ms.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [deviceId]);

  function handleVideoLoad(event: SyntheticEvent) {
    const video = event.target as HTMLVideoElement;
    onLoad({
      htmlElement: video,
      width: 330,
      height: 200,
    });
  }

  return (
    <div>
      <video
        style={{ display: 'none' }}
        className="mt-5 mb-5"
        ref={ref}
        autoPlay
        height="50"
        onLoadedData={handleVideoLoad}
      />
    </div>
  );
};

export default VideoBox;
