import { useEffect, useRef, useState } from 'react';

import { SourcePlayback } from '../../../virtual-background/helpers/sourceHelper';
import { useAppSelector } from '../../../../store';

const useVirtualBackground = (deviceId: string | undefined) => {
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [virtualBgLocalTrack, setVirtualBgLocalTrack] = useState<MediaStream>();
  const virtualBgVideoPlayer = useRef<HTMLVideoElement>(null);
  const isActiveWebcam = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWebcam,
  );

  useEffect(() => {
    // we'll only clear if the deviceId is empty & webcam isn't active.
    if (!deviceId && !isActiveWebcam) {
      if (virtualBgLocalTrack) {
        virtualBgLocalTrack.getTracks().forEach((t) => t.stop());
        setVirtualBgLocalTrack(undefined);
        setSourcePlayback(undefined);
      }
      return;
    }
    // otherwise, we won't do anything if there's no deviceId
    if (!deviceId) {
      return;
    }

    const createStream = async () => {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: deviceId, ideal: deviceId },
        },
      };
      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setVirtualBgLocalTrack(mediaStream);
    };

    createStream();
    //oxlint-disable-next-line
  }, [deviceId, isActiveWebcam]);

  useEffect(() => {
    if (virtualBgLocalTrack && virtualBgVideoPlayer.current) {
      virtualBgVideoPlayer.current.srcObject = virtualBgLocalTrack;
    }
    return () => {
      if (virtualBgLocalTrack) {
        virtualBgLocalTrack.getTracks().forEach((t) => t.stop());
      }
    };
  }, [virtualBgLocalTrack]);

  const handleVirtualBgVideoOnLoad = () => {
    const el = virtualBgVideoPlayer.current;
    if (el) {
      setSourcePlayback({
        htmlElement: el,
        width: el.videoWidth,
        height: el.videoHeight,
      });
    }
  };

  return {
    sourcePlayback,
    virtualBgVideoPlayer,
    handleVirtualBgVideoOnLoad,
  };
};

export default useVirtualBackground;
