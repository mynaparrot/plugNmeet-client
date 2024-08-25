import React, { useCallback, useEffect, useState } from 'react';

import { SourcePlayback } from '../../../virtual-background/helpers/sourceHelper';
import { BackgroundConfig } from '../../../virtual-background/helpers/backgroundHelper';
import VideoBox from './videoBox';
import { store, useAppDispatch } from '../../../../store';
import VirtualBackground from '../../../virtual-background/virtualBackground';
import BackgroundItems from './backgroundItems';
import { updateVirtualBackground } from '../../../../store/slices/bottomIconsActivitySlice';

interface IPreviewWebcamProps {
  deviceId: string;
}

const PreviewWebcam = ({ deviceId }: IPreviewWebcamProps) => {
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [show, setShow] = useState<boolean>(false);
  const [previousDeviceId, setPreviousDeviceId] = useState<string>();
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>();
  const [mediaStream, setMediaStream] = useState<MediaStream>();

  const currentUser = store.getState().session.currentUser?.userId;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (previousDeviceId !== deviceId) {
      setShow(false);
      setPreviousDeviceId(deviceId);
    }
    // eslint-disable-next-line
  }, [deviceId]);

  useEffect(() => {
    setShow(false);
    const changeView = () => {
      setTimeout(() => {
        setShow(true);
      }, 500);
    };
    if (sourcePlayback) {
      changeView();
    }
  }, [sourcePlayback]);

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [mediaStream]);

  const displayVB = useCallback(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      return false;
    }
    const room_features =
      store.getState().session.currentRoom.metadata?.roomFeatures;
    if (
      typeof room_features?.allowVirtualBg !== 'undefined' &&
      room_features.allowVirtualBg === false
    ) {
      return false;
    }

    return true;
  }, []);

  const onSelectBg = (bg: BackgroundConfig) => {
    dispatch(updateVirtualBackground(bg));

    if (bg.type === 'none') {
      setShow(false);
      setBackgroundConfig(undefined);
    } else {
      if (!show && deviceId) {
        setShow(true);
      }
      setBackgroundConfig(bg);
    }
  };

  return (
    <div className="mt-5">
      {deviceId ? (
        <div
          style={
            backgroundConfig
              ? { height: '0.5px', width: '0.5px' }
              : { width: 'auto' }
          }
        >
          <VideoBox
            deviceId={deviceId}
            onSourcePlayback={setSourcePlayback}
            onMediaStream={setMediaStream}
          />
        </div>
      ) : null}
      {show && sourcePlayback && currentUser && backgroundConfig ? (
        <VirtualBackground
          sourcePlayback={sourcePlayback}
          backgroundConfig={backgroundConfig}
          id={currentUser}
        />
      ) : null}
      {displayVB() ? <BackgroundItems onSelect={onSelectBg} /> : null}
    </div>
  );
};

export default PreviewWebcam;
