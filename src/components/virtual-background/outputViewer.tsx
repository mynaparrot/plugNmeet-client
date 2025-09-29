import React, { RefObject, useEffect } from 'react';
import { BodyPix } from '@tensorflow-models/body-pix';

import { BackgroundConfig } from './helpers/backgroundHelper';
import { PostProcessingConfig } from './helpers/postProcessingHelper';
import { SegmentationConfig } from './helpers/segmentationHelper';
import { SourcePlayback } from './helpers/sourceHelper';
import useRenderingPipeline from './hooks/useRenderingPipeline';
import { TFLite } from './helpers/utils';

type OutputViewerProps = {
  sourcePlayback: SourcePlayback;
  backgroundConfig: BackgroundConfig;
  segmentationConfig: SegmentationConfig;
  postProcessingConfig: PostProcessingConfig;
  bodyPix: BodyPix;
  tflite: TFLite;
  id: string;
  onCanvasRef?: (canvasRef: RefObject<HTMLCanvasElement>) => void;
};

const OutputViewer = ({
  sourcePlayback,
  backgroundConfig,
  segmentationConfig,
  postProcessingConfig,
  bodyPix,
  tflite,
  id,
  onCanvasRef,
}: OutputViewerProps) => {
  const { pipeline, canvasRef } = useRenderingPipeline(
    sourcePlayback,
    backgroundConfig,
    segmentationConfig,
    bodyPix,
    tflite,
  );

  useEffect(() => {
    if (onCanvasRef && canvasRef.current) {
      onCanvasRef(canvasRef);
    }
  }, [onCanvasRef, canvasRef]);

  useEffect(() => {
    if (pipeline) {
      pipeline.updatePostProcessingConfig(postProcessingConfig);
    }
  }, [pipeline, postProcessingConfig]);

  return (
    <div className="root preview-camera-webcam w-full h-64 3xl:h-80 flex">
      <canvas
        key={segmentationConfig.pipeline}
        ref={canvasRef}
        className="render w-full h-full object-cover"
        width={sourcePlayback.width}
        height={sourcePlayback.height}
        id={id}
      />
    </div>
  );
};

export default OutputViewer;
