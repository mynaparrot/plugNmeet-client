import { useMemo } from 'react';

import ScreenShareElements from '../../media-elements/screenshare';

export const useScreenShareElements = (hasScreenShareSubscribers: boolean) => {
  return useMemo(() => {
    if (hasScreenShareSubscribers) {
      return <ScreenShareElements />;
    }
    return null;
  }, [hasScreenShareSubscribers]);
};
