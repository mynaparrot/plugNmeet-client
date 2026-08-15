import { useMemo } from 'react';

import VideosComponent from '../../media-elements/videos';

export const useVideosComponent = (
  hasVideoSubscribers: boolean,
  showVerticalVideoView: boolean,
) => {
  return useMemo(() => {
    if (hasVideoSubscribers) {
      return <VideosComponent isVertical={showVerticalVideoView} />;
    }
    return null;
  }, [hasVideoSubscribers, showVerticalVideoView]);
};
