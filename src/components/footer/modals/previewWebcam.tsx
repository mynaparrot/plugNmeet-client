import React, { useEffect, useState } from 'react';

import { SourcePlayback } from '../../virtual-background/helpers/sourceHelper';
import {
  BackgroundConfig,
  defaultBackgroundConfig,
} from '../../virtual-background/helpers/backgroundHelper';
import VideoBox from './videoBox';
import { store } from '../../../store';
import VirtualBackground from '../../virtual-background/virtualBackground';

interface IPreviewWebcamProps {
  deviceId: string;
}

const PreviewWebcam = ({ deviceId }: IPreviewWebcamProps) => {
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [show, setShow] = useState<boolean>(false);
  const [previousDeviceId, setPreviousDeviceId] = useState<string>();
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>(
    defaultBackgroundConfig,
  );
  const [mediaStream, setMediaStream] = useState<MediaStream>();

  const currenUser = store.getState().session.currenUser?.userId;

  useEffect(() => {
    setBackgroundConfig({
      type: 'blur',
    });
    //  //const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
    // setBackgroundConfig({
    //   type: 'image',
    //   url: assetPath + '/backgrounds/shibuyasky-4768679_1280.jpg',
    // });

    // eslint-disable-next-line
  }, []);

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

  const onMediaStream = (newMediaStream) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    setMediaStream(newMediaStream);
  };

  return (
    <div className="mt-5">
      {deviceId ? (
        <VideoBox
          deviceId={deviceId}
          onSourcePlayback={setSourcePlayback}
          onMediaStream={onMediaStream}
        />
      ) : null}
      {show && sourcePlayback && currenUser ? (
        <VirtualBackground
          sourcePlayback={sourcePlayback}
          backgroundConfig={backgroundConfig}
          id={currenUser}
        />
      ) : null}
    </div>
  );
};

export default React.memo(PreviewWebcam);
