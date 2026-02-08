import { BackgroundConfig } from '../../helpers/backgroundHelper';
import { buildBackgroundImageStage } from './backgroundImageStage';
import { buildBackgroundBlurStage } from './backgroundBlurStage';
import { PostProcessingConfig } from '../../helpers/postProcessingHelper';

export interface BackgroundStage {
  render(): void;
  updatePostProcessingConfig(postProcessingConfig: PostProcessingConfig): void;
  cleanUp(): void;
}

export function buildBackgroundStage(
  backgroundConfig: BackgroundConfig,
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  positionBuffer: WebGLBuffer,
  texCoordBuffer: WebGLBuffer,
  personMaskTexture: WebGLTexture,
  canvas: HTMLCanvasElement,
  backgroundImage: HTMLImageElement | null,
): BackgroundStage {
  if (backgroundConfig.type === 'image') {
    return buildBackgroundImageStage(
      gl,
      positionBuffer,
      texCoordBuffer,
      personMaskTexture,
      backgroundImage,
      canvas,
    );
  } else if (backgroundConfig.type === 'blur-sm') {
    return buildBackgroundBlurStage(
      gl,
      vertexShader,
      positionBuffer,
      texCoordBuffer,
      personMaskTexture,
      canvas,
    );
  } else {
    // Default to a solid color background if no type is matched
    return buildBackgroundImageStage(
      gl,
      positionBuffer,
      texCoordBuffer,
      personMaskTexture,
      null, // No background image
      canvas,
    );
  }
}
