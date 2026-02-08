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
import { isWebGL2Supported, loadBodyPix } from './helpers/utils';

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
        const newConfig = { ...previousSegmentationConfig };
        if (newConfig.backend === 'wasmSimd' && !isSIMDSupported) {
          newConfig.backend = 'wasm';
        }
        if (newConfig.pipeline === 'webgl2' && !isWebGL2Supported()) {
          newConfig.pipeline = 'canvas2dCpu';
        }
        return newConfig;
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
