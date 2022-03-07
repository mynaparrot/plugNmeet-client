export type BlendMode = 'screen' | 'linearDodge';

export type PostProcessingConfig = {
  smoothSegmentationMask: boolean;
  jointBilateralFilter: JointBilateralFilterConfig;
  coverage: [number, number];
  lightWrapping: number;
  blendMode: BlendMode;
};

export const defaultPostProcessingConfig: PostProcessingConfig = {
  smoothSegmentationMask: true,
  jointBilateralFilter: { sigmaSpace: 1, sigmaColor: 0.1 },
  coverage: [0.5, 0.75],
  lightWrapping: 0.3,
  blendMode: 'screen',
};

export type JointBilateralFilterConfig = {
  sigmaSpace: number;
  sigmaColor: number;
};
