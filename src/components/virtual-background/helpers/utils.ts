import * as tfBodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import { once } from 'es-toolkit';

import { TFLite } from '../hooks/useTFLite';
import {
  getTFLiteModelFileName,
  SegmentationConfig,
} from './segmentationHelper';

declare function createTFLiteModule(): Promise<TFLite>;
declare function createTFLiteSIMDModule(): Promise<TFLite>;

const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
let bodyPixStore: tfBodyPix.BodyPix;
let isCalled = false;

export async function loadBodyPix() {
  if (isCalled) {
    return bodyPixStore;
  }
  isCalled = true;
  console.log('Loading TensorFlow.js and BodyPix segmentation model');
  await tf.ready();
  bodyPixStore = await tfBodyPix.load();
  console.log('TensorFlow.js and BodyPix loaded');
  return bodyPixStore;
}

export const loadTFLite = once(
  async (segmentationConfig: SegmentationConfig) => {
    let selectedTFLite: TFLite,
      isSIMDSupported: boolean = false;

    if (segmentationConfig.backend === 'wasmSimd') {
      try {
        selectedTFLite = await createTFLiteSIMDModule();
        isSIMDSupported = true;
      } catch (error) {
        console.error(
          'Failed to create TFLite SIMD WebAssembly module.',
          error,
        );
        return { selectedTFLite: undefined, isSIMDSupported };
      }
    } else {
      try {
        selectedTFLite = await createTFLiteModule();
      } catch (error) {
        console.error('Failed to create TFLite WebAssembly module.', error);
        return { selectedTFLite: undefined, isSIMDSupported };
      }
    }

    const modelFileName = getTFLiteModelFileName(
      segmentationConfig.model,
      segmentationConfig.inputResolution,
    );
    console.log('Loading tflite model:', modelFileName);

    const modelResponse = await fetch(
      `${assetPath}/models/${modelFileName}.tflite`,
    );
    const model = await modelResponse.arrayBuffer();
    console.log('Model buffer size:', model.byteLength);

    const modelBufferOffset = selectedTFLite._getModelBufferMemoryOffset();
    console.log('Model buffer memory offset:', modelBufferOffset);
    console.log('Loading model buffer...');
    selectedTFLite.HEAPU8.set(new Uint8Array(model), modelBufferOffset);
    console.log(
      '_loadModel result:',
      selectedTFLite._loadModel(model.byteLength),
    );

    console.log('Input memory offset:', selectedTFLite._getInputMemoryOffset());
    console.log('Input height:', selectedTFLite._getInputHeight());
    console.log('Input width:', selectedTFLite._getInputWidth());
    console.log('Input channels:', selectedTFLite._getInputChannelCount());

    console.log(
      'Output memory offset:',
      selectedTFLite._getOutputMemoryOffset(),
    );
    console.log('Output height:', selectedTFLite._getOutputHeight());
    console.log('Output width:', selectedTFLite._getOutputWidth());
    console.log('Output channels:', selectedTFLite._getOutputChannelCount());

    return { selectedTFLite, isSIMDSupported };
  },
);
