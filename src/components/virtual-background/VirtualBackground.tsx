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
};

const VirtualBackground = (props: OutputViewerProps) => {
  const { pipeline, backgroundImageRef, canvasRef } = useRenderingPipeline(
    props.sourcePlayback,
    props.backgroundConfig,
    props.segmentationConfig,
    props.bodyPix,
    props.tflite,
  );

  useEffect(() => {
    if (pipeline) {
      pipeline.updatePostProcessingConfig(props.postProcessingConfig);
    }
  }, [pipeline, props.postProcessingConfig]);

  return (
    <div className="root">
      {props.backgroundConfig.type === 'image' && (
        <img
          ref={backgroundImageRef}
          className="render"
          src={props.backgroundConfig.url}
          alt=""
          hidden={props.segmentationConfig.pipeline === 'webgl2'}
        />
      )}
      <canvas
        key={props.segmentationConfig.pipeline}
        ref={canvasRef}
        className="render"
        width={props.sourcePlayback.width}
        height={props.sourcePlayback.height}
      />
    </div>
  );
};

export default VirtualBackground;
