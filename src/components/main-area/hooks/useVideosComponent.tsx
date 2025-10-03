import { useMemo } from 'react';

import VideosComponent from '../../media-elements/videos';

export const useVideosComponent = (
  isActiveWebcamsView: boolean,
  showVerticalVideoView: boolean,
) => {
  return useMemo(() => {
    if (isActiveWebcamsView) {
      return <VideosComponent isVertical={showVerticalVideoView} />;
    }
    return null;
  }, [isActiveWebcamsView, showVerticalVideoView]);
};
