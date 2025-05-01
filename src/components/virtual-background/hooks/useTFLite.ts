import { useEffect, useState } from 'react';

import { SegmentationConfig } from '../helpers/segmentationHelper';
import { loadTFLite, TFLite } from '../helpers/utils';

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
