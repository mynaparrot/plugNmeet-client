import { BodyPix } from '@tensorflow-models/body-pix';
import { BackgroundConfig } from '../../helpers/backgroundHelper';
import { PostProcessingConfig } from '../../helpers/postProcessingHelper';
import {
  inputResolutions,
  SegmentationConfig,
} from '../../helpers/segmentationHelper';
import { SourcePlayback } from '../../helpers/sourceHelper';
import { TFLite } from '../../helpers/utils';

export function buildCanvas2dPipeline(
  sourcePlayback: SourcePlayback,
  backgroundConfig: BackgroundConfig,
  segmentationConfig: SegmentationConfig,
  canvas: HTMLCanvasElement,
  bodyPix: BodyPix,
  tflite: TFLite,
  addFrameEvent: () => void,
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const [segmentationWidth, segmentationHeight] =
    inputResolutions[segmentationConfig.inputResolution];
  const segmentationPixelCount = segmentationWidth * segmentationHeight;
  const segmentationMask = new ImageData(segmentationWidth, segmentationHeight);
  const segmentationMaskCanvas = document.createElement('canvas');
  segmentationMaskCanvas.width = segmentationWidth;
  segmentationMaskCanvas.height = segmentationHeight;

  const bgImg = document.createElement('img');
  bgImg.crossOrigin = 'anonymous';
  bgImg.src = backgroundConfig.url as string;

  const segmentationMaskCtx = segmentationMaskCanvas.getContext('2d', {
    willReadFrequently: true,
  })!;

  const inputMemoryOffset = tflite._getInputMemoryOffset() / 4;
  const outputMemoryOffset = tflite._getOutputMemoryOffset() / 4;

  let postProcessingConfig: PostProcessingConfig;

  async function render() {
    if (backgroundConfig.type !== 'none') {
      resizeSource();
    }

    addFrameEvent();

    if (backgroundConfig.type !== 'none') {
      if (segmentationConfig.model === 'bodyPix') {
        await runBodyPixInference();
      } else {
        runTFLiteInference();
      }
    }

    addFrameEvent();

    runPostProcessing();
  }

  function updatePostProcessingConfig(
    newPostProcessingConfig: PostProcessingConfig,
  ) {
    postProcessingConfig = newPostProcessingConfig;
  }

  function cleanUp() {
    // Nothing to clean up in this rendering pipeline
  }

  function resizeSource() {
    segmentationMaskCtx.drawImage(
      sourcePlayback.htmlElement,
      0,
      0,
      sourcePlayback.width,
      sourcePlayback.height,
      0,
      0,
      segmentationWidth,
      segmentationHeight,
    );

    if (
      segmentationConfig.model === 'meet' ||
      segmentationConfig.model === 'mlkit'
    ) {
      const imageData = segmentationMaskCtx.getImageData(
        0,
        0,
        segmentationWidth,
        segmentationHeight,
      );

      for (let i = 0; i < segmentationPixelCount; i++) {
        tflite.HEAPF32[inputMemoryOffset + i * 3] = imageData.data[i * 4] / 255;
        tflite.HEAPF32[inputMemoryOffset + i * 3 + 1] =
          imageData.data[i * 4 + 1] / 255;
        tflite.HEAPF32[inputMemoryOffset + i * 3 + 2] =
          imageData.data[i * 4 + 2] / 255;
      }
    }
  }

  async function runBodyPixInference() {
    const segmentation = await bodyPix.segmentPerson(segmentationMaskCanvas);
    for (let i = 0; i < segmentationPixelCount; i++) {
      // Sets only the alpha component of each pixel
      segmentationMask.data[i * 4 + 3] = segmentation.data[i] ? 255 : 0;
    }
    segmentationMaskCtx.putImageData(segmentationMask, 0, 0);
  }

  function runTFLiteInference() {
    tflite._runInference();

    for (let i = 0; i < segmentationPixelCount; i++) {
      if (segmentationConfig.model === 'meet') {
        const background = tflite.HEAPF32[outputMemoryOffset + i * 2];
        const person = tflite.HEAPF32[outputMemoryOffset + i * 2 + 1];
        const shift = Math.max(background, person);
        const backgroundExp = Math.exp(background - shift);
        const personExp = Math.exp(person - shift);

        // Sets only the alpha component of each pixel
        segmentationMask.data[i * 4 + 3] =
          (255 * personExp) / (backgroundExp + personExp); // softmax
      } else if (segmentationConfig.model === 'mlkit') {
        const person = tflite.HEAPF32[outputMemoryOffset + i];
        segmentationMask.data[i * 4 + 3] = 255 * person;
      }
    }
    segmentationMaskCtx.putImageData(segmentationMask, 0, 0);
  }

  function runPostProcessing() {
    ctx.globalCompositeOperation = 'copy';
    ctx.filter = 'none';

    if (postProcessingConfig?.smoothSegmentationMask) {
      if (backgroundConfig.type === 'blur-sm') {
        ctx.filter = 'blur(8px)'; // FIXME Does not work on Safari
      } else if (backgroundConfig.type === 'image') {
        ctx.filter = 'blur(4px)'; // FIXME Does not work on Safari
      }
    }

    if (backgroundConfig.type !== 'none') {
      drawSegmentationMask();
      ctx.globalCompositeOperation = 'source-in';
      ctx.filter = 'none';
    }

    ctx.drawImage(sourcePlayback.htmlElement, 0, 0);

    if (backgroundConfig.type === 'blur-sm') {
      blurBackground();
    } else if (backgroundConfig.type === 'image') {
      ctx.globalCompositeOperation = 'destination-over';
      drawImageProp(
        ctx,
        bgImg,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height,
        0.5,
        0.5,
      );
    }
  }

  function drawSegmentationMask() {
    ctx.drawImage(
      segmentationMaskCanvas,
      0,
      0,
      segmentationWidth,
      segmentationHeight,
      0,
      0,
      sourcePlayback.width,
      sourcePlayback.height,
    );
  }

  function blurBackground() {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.filter = 'blur(8px)'; // FIXME Does not work on Safari
    ctx.drawImage(sourcePlayback.htmlElement, 0, 0);
  }

  /**
   * By Ken Fyrstenberg Nilsen
   * https://stackoverflow.com/a/21961894/1281864
   *
   * drawImageProp(context, image [, x, y, width, height [,offsetX, offsetY]])
   *
   * If image and context are only arguments rectangle will equal canvas
   */
  function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
    if (arguments.length === 2) {
      x = y = 0;
      w = ctx.canvas.width;
      h = ctx.canvas.height;
    }

    // default offset is center
    offsetX = typeof offsetX === 'number' ? offsetX : 0.5;
    offsetY = typeof offsetY === 'number' ? offsetY : 0.5;

    // keep bounds [0.0, 1.0]
    if (offsetX < 0) offsetX = 0;
    if (offsetY < 0) offsetY = 0;
    if (offsetX > 1) offsetX = 1;
    if (offsetY > 1) offsetY = 1;

    const iw = img.width,
      ih = img.height,
      r = Math.min(w / iw, h / ih);

    let nw = iw * r, // new prop. width
      nh = ih * r, // new prop. height
      cx,
      cy,
      cw,
      ch,
      ar = 1;

    // decide which gap to fill
    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh; // updated
    nw *= ar;
    nh *= ar;

    // calc source rectangle
    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    // make sure source rectangle is valid
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    // fill image in dest. rectangle
    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  return { render, updatePostProcessingConfig, cleanUp };
}
