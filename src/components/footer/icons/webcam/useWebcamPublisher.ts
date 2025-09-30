import { createLocalVideoTrack, Track } from 'livekit-client';
import { useCallback } from 'react';

import { useAppDispatch } from '../../../../store';
import { getMediaServerConnRoom } from '../../../../helpers/livekit/utils';
import { getWebcamResolution } from '../../../../helpers/utils';
import { updateIsActiveWebcam } from '../../../../store/slices/bottomIconsActivitySlice';

const useWebcamPublisher = () => {
  const dispatch = useAppDispatch();
  const room = getMediaServerConnRoom();

  const replaceTrack = useCallback(
    async (newTrack: MediaStreamTrack): Promise<boolean> => {
      if (!room) return false;
      let replaced = false;
      for (const publication of room.localParticipant.videoTrackPublications.values()) {
        if (
          publication.track &&
          publication.track.source === Track.Source.Camera
        ) {
          newTrack.enabled = true;
          await publication.track.replaceTrack(newTrack, {
            userProvidedTrack: true,
          });
          replaced = true;
        }
      }
      return replaced;
    },
    [room],
  );

  const publishNewTrack = useCallback(
    async (deviceId: string) => {
      if (!room) return;
      const resolution = getWebcamResolution();
      const track = await createLocalVideoTrack({
        deviceId: { exact: deviceId, ideal: deviceId },
        resolution,
      });

      const replaced = await replaceTrack(track.mediaStreamTrack);
      if (!replaced) {
        await room.localParticipant.publishTrack(track);
      }
      dispatch(updateIsActiveWebcam(true));
    },
    [dispatch, room, replaceTrack],
  );

  return {
    publishNewTrack,
    replaceTrack,
  };
};

export default useWebcamPublisher;
