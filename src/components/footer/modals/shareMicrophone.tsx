import React from 'react';
import { createLocalTracks, Room, Track } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';

import {
  useAppSelector,
  RootState,
  useAppDispatch,
  store,
} from '../../../store';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateShowMicrophoneModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import { updateSelectedAudioDevice } from '../../../store/slices/roomSettingsSlice';
import { updateMuteOnStart } from '../../../store/slices/sessionSlice';
import MicrophoneModal from './microphoneModal';

interface IMicrophoneIconProps {
  currentRoom?: Room;
}

const showMicrophoneModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showMicrophoneModal,
  (showMicrophoneModal) => showMicrophoneModal,
);
const ShareMicrophoneModal = ({ currentRoom }: IMicrophoneIconProps) => {
  const showMicrophoneModal = useAppSelector(showMicrophoneModalSelector);
  const dispatch = useAppDispatch();
  const muteOnStart =
    store.getState().session.currentRoom.metadata?.room_features
      .mute_on_start ?? false;

  const shareMic = async (deviceId) => {
    dispatch(updateShowMicrophoneModal(false));

    if (isEmpty(deviceId)) {
      return;
    }

    const localTrack = await createLocalTracks({
      audio: {
        deviceId: deviceId,
      },
      video: false,
    });

    localTrack.forEach(async (track) => {
      if (track.kind === Track.Kind.Audio) {
        await currentRoom?.localParticipant.publishTrack(track);
        dispatch(updateIsActiveMicrophone(true));
      }
    });

    if (muteOnStart) {
      setTimeout(async () => {
        currentRoom?.localParticipant.audioTracks.forEach(
          async (publication) => {
            if (
              publication.track &&
              publication.track.source === Track.Source.Microphone
            ) {
              if (!publication.isMuted) {
                await publication.track.mute();
                dispatch(updateIsMicMuted(true));
                // we'll disable it as it was first time only.
                dispatch(updateMuteOnStart(false));
              }
            }
          },
        );
      }, 500);
    }

    dispatch(updateSelectedAudioDevice(deviceId));
  };

  return showMicrophoneModal ? (
    <MicrophoneModal
      show={showMicrophoneModal}
      onCloseMicrophoneModal={shareMic}
    />
  ) : null;
};

export default ShareMicrophoneModal;
