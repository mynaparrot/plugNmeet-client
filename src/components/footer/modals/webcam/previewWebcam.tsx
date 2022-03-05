import React, { useEffect, useState } from 'react';

import { SourcePlayback } from '../../../virtual-background/helpers/sourceHelper';
import { BackgroundConfig } from '../../../virtual-background/helpers/backgroundHelper';
import VideoBox from './videoBox';
import { store } from '../../../../store';
import VirtualBackground from '../../../virtual-background/virtualBackground';
import BackgroundItems from './backgroundItems';

interface IPreviewWebcamProps {
  deviceId: string;
}

const PreviewWebcam = ({ deviceId }: IPreviewWebcamProps) => {
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [show, setShow] = useState<boolean>(false);
  const [previousDeviceId, setPreviousDeviceId] = useState<string>();
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>();
  const [mediaStream, setMediaStream] = useState<MediaStream>();

  const currenUser = store.getState().session.currenUser?.userId;

  useEffect(() => {
    // setBackgroundConfig({
    //   type: 'blur',
    // });
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

  const onSelectBg = (bg: BackgroundConfig) => {
    console.log(bg);
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
        <div style={backgroundConfig ? { display: 'none' } : { display: '' }}>
          <VideoBox
            deviceId={deviceId}
            onSourcePlayback={setSourcePlayback}
            onMediaStream={setMediaStream}
          />
        </div>
      ) : null}
      {show && sourcePlayback && currenUser && backgroundConfig ? (
        <VirtualBackground
          sourcePlayback={sourcePlayback}
          backgroundConfig={backgroundConfig}
          id={currenUser}
        />
      ) : null}
      <BackgroundItems onSelect={onSelectBg} />
    </div>
  );
};

export default React.memo(PreviewWebcam);
