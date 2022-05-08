import React, { useEffect } from 'react';
import { BodyPix } from '@tensorflow-models/body-pix';

import { BackgroundConfig } from './helpers/backgroundHelper';
import { PostProcessingConfig } from './helpers/postProcessingHelper';
import { SegmentationConfig } from './helpers/segmentationHelper';
import { SourcePlayback } from './helpers/sourceHelper';
import useRenderingPipeline from './hooks/useRenderingPipeline';

type OutputViewerProps = {
  sourcePlayback: SourcePlayback;
  backgroundConfig: BackgroundConfig;
  segmentationConfig: SegmentationConfig;
  postProcessingConfig: PostProcessingConfig;
  bodyPix: BodyPix;
  tflite: any;
  id: string;
  onCanvasRef?: (canvasRef: React.MutableRefObject<HTMLCanvasElement>) => void;
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
    if (pipeline) {
      pipeline.updatePostProcessingConfig(postProcessingConfig);
    }
  }, [pipeline, postProcessingConfig]);

  useEffect(() => {
    const sendCanvasRef = () => {
      if (onCanvasRef && canvasRef) {
        onCanvasRef(canvasRef);
      }
    };

    const timeout = setTimeout(() => {
      sendCanvasRef();
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line
  }, [canvasRef]);

  return (
    <div className="root preview-camera-webcam">
      <canvas
        key={segmentationConfig.pipeline}
        ref={canvasRef}
        className="render w-full my-5"
        width={sourcePlayback.width}
        height={sourcePlayback.height}
        id={id}
      />
    </div>
  );
};

export default OutputViewer;
