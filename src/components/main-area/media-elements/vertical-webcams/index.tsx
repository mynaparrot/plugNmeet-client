import React, { useMemo } from 'react';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';

import VideoElements from '../videos';

interface IVerticalWebcamsProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const VerticalWebcams = ({ videoSubscribers }: IVerticalWebcamsProps) => {
  return useMemo(() => {
    if (!videoSubscribers) {
      return null;
    }
    return (
      <VideoElements
        videoSubscribers={videoSubscribers}
        perPage={3}
        isVertical={true}
      />
    );
  }, [videoSubscribers]);
};

export default VerticalWebcams;
