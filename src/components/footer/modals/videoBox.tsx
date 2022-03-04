import React, { useRef, useEffect, SyntheticEvent, useState } from 'react';
import { SourcePlayback } from '../../virtual-background/helpers/sourceHelper';

interface IVideoBoxProps {
  deviceId: string;
  onLoad: (sourcePlayback: SourcePlayback) => void;
}
const VideoBox = ({ deviceId, onLoad }: IVideoBoxProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream>();

  useEffect(() => {
    const el = ref.current;
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId,
      },
    };
    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      if (el) {
        setMediaStream(mediaStream);
        el.srcObject = mediaStream;
      }
    });
    return () => {
      if (el) {
        el.pause();
        el.removeAttribute('src'); // empty source
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
    // eslint-disable-next-line
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
