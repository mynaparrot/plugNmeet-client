import React, { useState, useEffect } from 'react';
import { SourcePlayback } from '../../virtual-background/helpers/sourceHelper';
import useBodyPix from '../../virtual-background/hooks/useBodyPix';
import useTFLite from '../../virtual-background/hooks/useTFLite';
import { SegmentationConfig } from '../../virtual-background/helpers/segmentationHelper';
import { PostProcessingConfig } from '../../virtual-background/helpers/postProcessingHelper';
import VirtualBackground from '../../virtual-background/VirtualBackground';
import { BackgroundConfig } from '../../virtual-background/helpers/backgroundHelper';
import VideoBox from './videoBox';

interface IPreviewWebcamProps {
  deviceId: string;
}
const PreviewWebcam = ({ deviceId }: IPreviewWebcamProps) => {
  //const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [show, setShow] = useState<boolean>(false);
  const [previousDeviceId, setPreviousDeviceId] = useState<string>();
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>();

  const [segmentationConfig, setSegmentationConfig] =
    useState<SegmentationConfig>({
      model: 'meet',
      backend: 'wasmSimd',
      inputResolution: '160x96',
      pipeline: 'webgl2',
    });

  const postProcessingConfig: PostProcessingConfig = {
    smoothSegmentationMask: true,
    jointBilateralFilter: { sigmaSpace: 1, sigmaColor: 0.1 },
    coverage: [0.5, 0.75],
    lightWrapping: 0.3,
    blendMode: 'screen',
  };

  const bodyPix: any = useBodyPix();
  const { tflite, isSIMDSupported } = useTFLite(segmentationConfig);

  useEffect(() => {
    if (bodyPix) {
      setSegmentationConfig((previousSegmentationConfig) => {
        if (
          previousSegmentationConfig.backend === 'wasmSimd' &&
          !isSIMDSupported
        ) {
          return { ...previousSegmentationConfig, backend: 'wasm' };
        } else {
          return previousSegmentationConfig;
        }
      });
    }

    setBackgroundConfig({
      type: 'blur',
    });
    // setBackgroundConfig({
    //   type: 'image',
    //   url: assetPath + '/backgrounds/shibuyasky-4768679_1280.jpg',
    // });
    // eslint-disable-next-line
  }, [isSIMDSupported]);

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

  return (
    <div className="mt-5">
      <VideoBox deviceId={deviceId} onLoad={setSourcePlayback} />
      {show && sourcePlayback && bodyPix && tflite && backgroundConfig ? (
        <VirtualBackground
          sourcePlayback={sourcePlayback}
          backgroundConfig={backgroundConfig}
          segmentationConfig={segmentationConfig}
          postProcessingConfig={postProcessingConfig}
          bodyPix={bodyPix}
          tflite={tflite}
        />
      ) : null}
    </div>
  );
};

export default PreviewWebcam;
