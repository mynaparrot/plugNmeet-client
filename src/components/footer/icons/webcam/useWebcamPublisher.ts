import { useCallback, useRef } from 'react';
import {
  createLocalVideoTrack,
  LocalTrackPublication,
  Track,
  TrackPublishOptions,
} from 'livekit-client';

import { useAppDispatch } from '../../../../store';
import { getMediaServerConnRoom } from '../../../../helpers/livekit/utils';
import { getWebcamResolution } from '../../../../helpers/utils';
import { updateIsActiveWebcam } from '../../../../store/slices/bottomIconsActivitySlice';

const useWebcamPublisher = () => {
  const dispatch = useAppDispatch();
  const room = getMediaServerConnRoom();
  const publishing = useRef<boolean>(false);

  const replaceTrack = useCallback(
    async (newTrack: MediaStreamTrack): Promise<boolean> => {
      if (!room || publishing.current) return false;
      let replaced = false;
      publishing.current = true;

      const publications = room.localParticipant.getTrackPublications();
      for (let i = 0; i < publications.length; i++) {
        const pub = publications[i] as LocalTrackPublication;
        if (pub.source === Track.Source.Camera && pub.track) {
          newTrack.enabled = true;
          await pub.track.replaceTrack(newTrack, {
            userProvidedTrack: true,
          });
          replaced = true;
          break;
        }
      }
      publishing.current = false;
      return replaced;
    },
    [room],
  );

  /**
   * publishNewTrack will end any of the previous tracks,
   * don't use this for replacement
   */
  const publishNewTrack = useCallback(
    async (
      deviceId: string,
      mediaStreamTrack?: MediaStreamTrack,
      options?: TrackPublishOptions,
    ) => {
      if (!room || publishing.current) return;
      publishing.current = true;

      const publications = room.localParticipant.getTrackPublications();
      for (let i = 0; i < publications.length; i++) {
        const pub = publications[i] as LocalTrackPublication;
        if (pub.source === Track.Source.Camera && pub.track) {
          await room.localParticipant.unpublishTrack(pub.track, true);
        }
      }

      const resolution = getWebcamResolution();
      if (deviceId !== '') {
        const track = await createLocalVideoTrack({
          deviceId: { exact: deviceId, ideal: deviceId },
          resolution,
        });
        await room.localParticipant.publishTrack(track);
      } else if (mediaStreamTrack) {
        await room.localParticipant.publishTrack(mediaStreamTrack, options);
      } else {
        console.error('webcam publishing was not successful');
        publishing.current = false;
        return;
      }

      dispatch(updateIsActiveWebcam(true));
      publishing.current = false;
    },
    [dispatch, room],
  );

  return {
    publishNewTrack,
    replaceTrack,
  };
};

export default useWebcamPublisher;
