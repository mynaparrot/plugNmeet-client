import React, { useEffect, useState } from 'react';

import OutputViewer from './outputViewer';
import { defaultPostProcessingConfig } from './helpers/postProcessingHelper';
import { SourcePlayback } from './helpers/sourceHelper';
import {
  BackgroundConfig,
  defaultBackgroundConfig,
} from './helpers/backgroundHelper';
import useBodyPix from './hooks/useBodyPix';
import useTFLite from './hooks/useTFLite';
import {
  defaultSegmentationConfig,
  SegmentationConfig,
} from './helpers/segmentationHelper';

interface IVirtualBackgroundProps {
  sourcePlayback: SourcePlayback;
  backgroundConfig?: BackgroundConfig;
  id: string;
  onCanvasRef?: (canvasRef: React.MutableRefObject<HTMLCanvasElement>) => void;
}

const VirtualBackground = ({
  sourcePlayback,
  backgroundConfig,
  id,
  onCanvasRef,
}: IVirtualBackgroundProps) => {
  const [segmentationConfig, setSegmentationConfig] =
    useState<SegmentationConfig>(defaultSegmentationConfig);

  const bodyPix = useBodyPix();
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
    // eslint-disable-next-line
  }, [isSIMDSupported]);

  return (
    <>
      {sourcePlayback && bodyPix && tflite ? (
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
      ) : null}
    </>
  );
};

export default VirtualBackground;
