import {
  GaussianBlurBackgroundProcessor,
  ImageFit,
  VirtualBackgroundProcessor,
  isSupported,
} from '@twilio/video-processors';
import { Track, TrackProcessor, VideoProcessorOptions } from 'livekit-client';

import { getConfigValue } from '../utils';

export type BackgroundConfig = {
  type: 'none' | 'blur' | 'image';
  url?: string;
};

const assetPath = getConfigValue(
  'staticAssetsPath',
  '/assets',
  'STATIC_ASSETS_PATH',
);
const vbPaths = `${assetPath}/backgrounds/assets`;

class TwilioTrackProcessor implements TrackProcessor<Track.Kind.Video> {
  name = 'pnm-virtual-background';

  private processor:
    | GaussianBlurBackgroundProcessor
    | VirtualBackgroundProcessor
    | null = null;
  private sourceElement: HTMLVideoElement | undefined = undefined;
  private canvas = document.createElement('canvas');
  private isProcessing = false;
  private isDestroyed = false; // Flag to prevent multiple destroys.

  readonly processedTrack: MediaStreamTrack;

  constructor(private backgroundConfig: BackgroundConfig) {
    this.processedTrack = this.canvas.captureStream().getVideoTracks()[0];
  }

  async init(opts: VideoProcessorOptions) {
    if (opts.element) {
      this.sourceElement = opts.element as HTMLVideoElement;
    } else {
      this.sourceElement = document.createElement('video');
    }

    this.sourceElement.srcObject = new MediaStream([opts.track]);
    this.sourceElement.autoplay = true;
    this.sourceElement.muted = true;
    await this.sourceElement.play();

    await this.initTwilioProcessor();
    await this.startProcessingLoop();
  }

  private loadImage(src: string): Promise<HTMLImageElement | undefined> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      try {
        const imageUrl = new URL(src, window.location.href);
        if (imageUrl.origin !== window.location.origin) {
          // not the same origin
          img.crossOrigin = 'anonymous';
        }
      } catch (e) {
        // This will catch malformed URLs that the constructor can't parse.
        console.error(`[loadImage] Invalid URL provided: ${src}`, e);
        reject(new Error(`Invalid URL: ${src}`));
        return;
      }

      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.decode();
    });
  }

  private async initTwilioProcessor() {
    if (this.backgroundConfig.type === 'blur') {
      this.processor = new GaussianBlurBackgroundProcessor({
        assetsPath: vbPaths,
        useWebWorker: true,
      });
    } else if (
      this.backgroundConfig.type === 'image' &&
      this.backgroundConfig.url
    ) {
      const backgroundImage = await this.loadImage(this.backgroundConfig.url);
      if (!backgroundImage) {
        console.error('failed to load image', this.backgroundConfig.url);
        return;
      }

      this.processor = new VirtualBackgroundProcessor({
        assetsPath: vbPaths,
        backgroundImage: backgroundImage,
        fitType: ImageFit.Fill,
        useWebWorker: true,
      });
    }

    if (this.processor) {
      await this.processor.loadModel();
    }
  }

  private renderLoop = async () => {
    if (
      !this.isProcessing ||
      !this.processor ||
      !this.sourceElement ||
      this.sourceElement.videoWidth === 0
    ) {
      return;
    }

    if (
      this.canvas.width !== this.sourceElement.videoWidth ||
      this.canvas.height !== this.sourceElement.videoHeight
    ) {
      this.canvas.width = this.sourceElement.videoWidth;
      this.canvas.height = this.sourceElement.videoHeight;
    }

    try {
      await this.processor.processFrame(this.sourceElement, this.canvas);
    } catch (e) {
      console.error('Failed to process frame for virtual background', e);
      this.isProcessing = false;
    }

    if (this.isProcessing) {
      // continue looping
      this.renderLoop().then();
    }
  };

  private async startProcessingLoop() {
    if (this.processor) {
      this.isProcessing = true;
      await this.renderLoop();
    }
  }

  private cleanupSourceStream() {
    if (this.sourceElement && this.sourceElement.srcObject) {
      this.sourceElement.pause();
      const stream = this.sourceElement.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      this.sourceElement.srcObject = null;
    }
  }

  async restart(opts: VideoProcessorOptions) {
    if (!this.sourceElement) {
      return;
    }

    this.isProcessing = false;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    this.cleanupSourceStream();

    this.sourceElement.srcObject = new MediaStream([opts.track]);
    await this.sourceElement.play();

    await this.startProcessingLoop();
  }

  async update(backgroundConfig: BackgroundConfig) {
    // If the new type is 'none', it's a signal to stop and clean up completely.
    if (backgroundConfig.type === 'none') {
      await this.destroy();
      return;
    }

    // Otherwise, update to the new background.
    this.isProcessing = false;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    this.backgroundConfig = backgroundConfig;
    this.processor = null;

    await this.initTwilioProcessor();
    await this.startProcessingLoop();
  }

  async onUnpublish() {
    await this.destroy();
  }

  async destroy() {
    // Prevent the destroy logic from running multiple times.
    if (this.isDestroyed) {
      return;
    }
    // Set the flag immediately to prevent race conditions.
    this.isDestroyed = true;

    this.isProcessing = false;
    this.processor = null;
    this.cleanupSourceStream();
    this.processedTrack?.stop();
  }
}

// Factory function to create a new processor with the given config.
export function createVirtualBackgroundProcessor(
  backgroundConfig: BackgroundConfig,
): TwilioTrackProcessor {
  return new TwilioTrackProcessor(backgroundConfig);
}
export type TwilioBackgroundProcessor = TwilioTrackProcessor;

// run during application bootup and cache, so next time it will be faster
if (isSupported) {
  (async () => {
    try {
      const blur = new GaussianBlurBackgroundProcessor({
        assetsPath: vbPaths,
      });

      // create a blank image
      const blankImage = new Image();
      blankImage.src =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      await blankImage.decode();

      const imageVb = new VirtualBackgroundProcessor({
        assetsPath: vbPaths,
        backgroundImage: blankImage,
      });

      Promise.all([blur.loadModel(), imageVb.loadModel()]).then();
    } catch (e) {
      console.error(e);
    }
  })();
}
