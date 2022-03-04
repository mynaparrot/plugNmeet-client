import React, { useRef, useEffect } from 'react';

interface IPreviewWebcamProps {
  deviceId: string;
}
const PreviewWebcam = ({ deviceId }: IPreviewWebcamProps) => {
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

  return (
    <div>
      <video className="mt-5 mb-5" ref={ref} autoPlay height="50" />
    </div>
  );
};

export default PreviewWebcam;
