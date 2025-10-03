import { useMemo } from 'react';

import ScreenShareElements from '../../media-elements/screenshare';

export const useScreenShareElements = (isActiveScreenSharingView: boolean) => {
  return useMemo(() => {
    if (isActiveScreenSharingView) {
      return <ScreenShareElements />;
    }
    return null;
  }, [isActiveScreenSharingView]);
};
