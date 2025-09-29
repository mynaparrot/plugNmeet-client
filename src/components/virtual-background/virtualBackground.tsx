import React, { RefObject, useEffect, useState } from 'react';
import { BodyPix } from '@tensorflow-models/body-pix';

import OutputViewer from './outputViewer';
import { defaultPostProcessingConfig } from './helpers/postProcessingHelper';
import { SourcePlayback } from './helpers/sourceHelper';
import {
  BackgroundConfig,
  defaultBackgroundConfig,
} from './helpers/backgroundHelper';
import useTFLite from './hooks/useTFLite';
import {
  defaultSegmentationConfig,
  SegmentationConfig,
} from './helpers/segmentationHelper';
import { loadBodyPix } from './helpers/utils';

interface IVirtualBackgroundProps {
  sourcePlayback: SourcePlayback;
  backgroundConfig?: BackgroundConfig;
  id: string;
  onCanvasRef?: (canvasRef: RefObject<HTMLCanvasElement>) => void;
}

const VirtualBackground = ({
  sourcePlayback,
  backgroundConfig,
  id,
  onCanvasRef,
}: IVirtualBackgroundProps) => {
  const [segmentationConfig, setSegmentationConfig] =
    useState<SegmentationConfig>(defaultSegmentationConfig);
  const [bodyPix, setBodyPix] = useState<BodyPix | undefined>(undefined);

  const { tflite, isSIMDSupported } = useTFLite(segmentationConfig);

  useEffect(() => {
    loadBodyPix(false).then((pix) => {
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
      setBodyPix(pix);
    });
  }, [isSIMDSupported]);

  return (
    sourcePlayback &&
    bodyPix &&
    tflite && (
      <OutputViewer
        sourcePlayback={sourcePlayback}
        backgroundConfig={backgroundConfig ?? defaultBackgroundConfig}
        segmentationConfig={segmentationConfig}
        postProcessingConfig={defaultPostProcessingConfig}
        bodyPix={bodyPix}
        tflite={tflite}
        id={id}
        onCanvasRef={onCanvasRef}
      />
    )
  );
};

export default VirtualBackground;
