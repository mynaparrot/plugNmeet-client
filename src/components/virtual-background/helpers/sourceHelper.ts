export type SourceConfig = {
  type: 'image' | 'video' | 'camera';
  url?: string;
};

export type SourcePlayback = {
  htmlElement: HTMLImageElement | HTMLVideoElement;
  width: number;
  height: number;
};
