import { useEffect, useState } from 'react';

import { SegmentationConfig } from '../helpers/segmentationHelper';
import { loadTFLite } from '../helpers/utils';

export interface TFLite extends EmscriptenModule {
  _getModelBufferMemoryOffset(): number;
  _getInputMemoryOffset(): number;
  _getInputHeight(): number;
  _getInputWidth(): number;
  _getInputChannelCount(): number;
  _getOutputMemoryOffset(): number;
  _getOutputHeight(): number;
  _getOutputWidth(): number;
  _getOutputChannelCount(): number;
  _loadModel(bufferSize: number): number;
  _runInference(): number;
}

function useTFLite(segmentationConfig: SegmentationConfig) {
  const [selectedTFLite, setSelectedTFLite] = useState<TFLite>();
  const [isSIMDSupported, setSIMDSupported] = useState<boolean | undefined>(
    undefined,
  );

  useEffect(() => {
    loadTFLite(segmentationConfig).then(
      ({ selectedTFLite, isSIMDSupported }) => {
        setSelectedTFLite(selectedTFLite);
        setSIMDSupported(isSIMDSupported);
      },
    );
    //eslint-disable-next-line
  }, []);

  return { tflite: selectedTFLite, isSIMDSupported };
}

export default useTFLite;
