import * as tfBodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import { once } from 'es-toolkit';

import {
  getTFLiteModelFileName,
  SegmentationConfig,
} from './segmentationHelper';

declare const IS_PRODUCTION: boolean;
declare function createTFLiteModule(): Promise<TFLite>;
declare function createTFLiteSIMDModule(): Promise<TFLite>;

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

const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';
let bodyPixStore: tfBodyPix.BodyPix,
  isCalled = false,
  loadedModel = '',
  modelResponse: Response;

const loadTFLiteSIMDModule = once(async () => {
  try {
    displayLog('loading TFLiteSIMDModule');
    const module = await createTFLiteSIMDModule();
    displayLog('loaded TFLiteSIMDModule');
    return module;
  } catch (error) {
    console.error('Failed to create TFLite SIMD WebAssembly module.', error);
  }
  return undefined;
});

async function fetchModel(modelFileName: string): Promise<Response> {
  if (loadedModel === modelFileName) {
    return modelResponse;
  }
  loadedModel = modelFileName;
  displayLog('Loading tflite model:', modelFileName);
  modelResponse = await fetch(`${assetPath}/models/${modelFileName}.tflite`);
  displayLog('Loaded tflite model:', modelFileName);
  return modelResponse;
}

export async function loadBodyPix(loadSimdModule: boolean) {
  if (isCalled) {
    return bodyPixStore;
  }
  isCalled = true;
  displayLog('Loading TensorFlow.js and BodyPix segmentation model');
  await tf.ready();
  bodyPixStore = await tfBodyPix.load();
  displayLog('TensorFlow.js and BodyPix loaded');

  if (loadSimdModule) {
    loadTFLiteSIMDModule().then(() => fetchModel('segm_lite_v681').then());
  }
  return bodyPixStore;
}

export const loadTFLite = once(
  async (segmentationConfig: SegmentationConfig) => {
    let selectedTFLite: TFLite,
      isSIMDSupported: boolean = false;

    if (segmentationConfig.backend === 'wasmSimd') {
      const loadedTFLite = await loadTFLiteSIMDModule();
      if (typeof loadedTFLite === 'undefined') {
        return { selectedTFLite: undefined, isSIMDSupported };
      }
      selectedTFLite = loadedTFLite;
      isSIMDSupported = true;
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

    const modelResponse = await fetchModel(modelFileName);
    const model = await modelResponse.arrayBuffer();
    displayLog('Model buffer size:', model.byteLength);

    const modelBufferOffset = selectedTFLite._getModelBufferMemoryOffset();
    displayLog('Model buffer memory offset:', modelBufferOffset);
    displayLog('Loading model buffer...');
    selectedTFLite.HEAPU8.set(new Uint8Array(model), modelBufferOffset);
    displayLog(
      '_loadModel result:',
      selectedTFLite._loadModel(model.byteLength),
    );

    displayLog('Input memory offset:', selectedTFLite._getInputMemoryOffset());
    displayLog('Input height:', selectedTFLite._getInputHeight());
    displayLog('Input width:', selectedTFLite._getInputWidth());
    displayLog('Input channels:', selectedTFLite._getInputChannelCount());

    displayLog(
      'Output memory offset:',
      selectedTFLite._getOutputMemoryOffset(),
    );
    displayLog('Output height:', selectedTFLite._getOutputHeight());
    displayLog('Output width:', selectedTFLite._getOutputWidth());
    displayLog('Output channels:', selectedTFLite._getOutputChannelCount());

    return { selectedTFLite, isSIMDSupported };
  },
);

function displayLog(message?: any, ...optionalParams: any[]) {
  if (IS_PRODUCTION) {
    return;
  }
  console.log(message, ...optionalParams);
}
