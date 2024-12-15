import React, { useEffect, useState } from 'react';
import { createLocalTracks, ParticipantEvent, Track } from 'livekit-client';
// import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  AnalyticsStatus,
  AnalyticsStatusSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateShowMicrophoneModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import MicMenu from './mic-menu';
import { participantsSelector } from '../../../store/slices/participantSlice';
import MicrophoneModal from '../modals/microphoneModal';
import { updateMuteOnStart } from '../../../store/slices/sessionSlice';
import { updateSelectedAudioDevice } from '../../../store/slices/roomSettingsSlice';
import { getAudioPreset } from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import { getNatsConn } from '../../../helpers/nats';
import { Microphone } from '../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../assets/Icons/MicrophoneOff';
import { PlusIcon } from '../../../assets/Icons/PlusIcon';
// import { BlockedIcon } from '../../../assets/Icons/BlockedIcon';

const MicrophoneIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  // const { t } = useTranslation();
  const conn = getNatsConn();

  const session = store.getState().session;
  const showTooltip = session.userDeviceType === 'desktop';
  const muteOnStart =
    session.currentRoom.metadata?.roomFeatures?.muteOnStart ?? false;

  const showMicrophoneModal = useAppSelector(
    (state) => state.bottomIconsActivity.showMicrophoneModal,
  );
  const isActiveMicrophone = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveMicrophone,
  );
  const isMicLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const isMicMuted = useAppSelector(
    (state) => state.bottomIconsActivity.isMicMuted,
  );
  const selectedAudioDevice = useAppSelector(
    (state) => state.roomSettings.selectedAudioDevice,
  );

  const [lockMic, setLockMic] = useState<boolean>(false);

  // for change in mic lock setting
  useEffect(() => {
    const closeMicOnLock = async () => {
      for (const [
        ,
        publication,
        // eslint-disable-next-line no-unsafe-optional-chaining
      ] of currentRoom?.localParticipant.audioTrackPublications.entries()) {
        if (
          publication.track &&
          publication.source === Track.Source.Microphone
        ) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }

      dispatch(updateIsActiveMicrophone(false));
      dispatch(updateIsMicMuted(false));
    };

    if (isMicLock) {
      setLockMic(true);

      const currentUser = participantsSelector.selectById(
        store.getState(),
        currentRoom.localParticipant.identity,
      );
      if (currentUser?.audioTracks) {
        closeMicOnLock();
      }
    } else {
      setLockMic(false);
    }
  }, [isMicLock, currentRoom, dispatch]);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.defaultLockSettings
        ?.lockMicrophone;
    const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

    if (isLock && !isAdmin) {
      if (isMicLock !== false) {
        setLockMic(true);
      }
    }
    // eslint-disable-next-line
  }, []);

  // for speaking to send stats
  useEffect(() => {
    if (!currentRoom) {
      return;
    }
    const speakingHandler = (speaking: boolean) => {
      if (!speaking) {
        const lastSpokeAt = currentRoom.localParticipant.lastSpokeAt?.getTime();
        if (lastSpokeAt && lastSpokeAt > 0) {
          const cal = Date.now() - lastSpokeAt;
          // send analytics
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED_DURATION,
            AnalyticsEventType.USER,
            undefined,
            undefined,
            cal.toString(),
          );
        }
      } else {
        // send analytics as user has spoken
        conn.sendAnalyticsData(
          AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED,
          AnalyticsEventType.USER,
          undefined,
          undefined,
          '1',
        );
      }
    };

    currentRoom.localParticipant.on(
      ParticipantEvent.IsSpeakingChanged,
      speakingHandler,
    );
    return () => {
      currentRoom.localParticipant.off(
        ParticipantEvent.IsSpeakingChanged,
        speakingHandler,
      );
    };
    //eslint-disable-next-line
  }, [currentRoom]);

  // initially only
  useEffect(() => {
    if (selectedAudioDevice) {
      onCloseMicrophoneModal(selectedAudioDevice).then();
    }
    //eslint-disable-next-line
  }, []);

  const muteUnmuteMic = async () => {
    for (const [
      ,
      publication,
      // eslint-disable-next-line no-unsafe-optional-chaining
    ] of currentRoom?.localParticipant.audioTrackPublications.entries()) {
      if (
        publication.track &&
        publication.track.source === Track.Source.Microphone
      ) {
        if (publication.isMuted) {
          await publication.track.unmute();
          dispatch(updateIsMicMuted(false));

          // send analytics
          const val = AnalyticsStatusSchema.values[AnalyticsStatus.UNMUTED];
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            val['name'],
          );
        } else {
          await publication.track.mute();
          dispatch(updateIsMicMuted(true));

          // send analytics
          const val = AnalyticsStatusSchema.values[AnalyticsStatus.MUTED];
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            val['name'],
          );
        }
      }
    }
  };

  const manageMic = async () => {
    if (!isActiveMicrophone && !lockMic) {
      dispatch(updateShowMicrophoneModal(true));
    }

    if (isActiveMicrophone) {
      await muteUnmuteMic();
    }
  };

  // const getTooltipText = () => {
  //   if (!isActiveMicrophone && !lockMic) {
  //     return t('footer.icons.start-microphone-sharing');
  //   } else if (!isActiveMicrophone && lockMic) {
  //     return t('footer.icons.microphone-locked');
  //   }

  //   if (isActiveMicrophone && !isMicMuted) {
  //     return t('footer.menus.mute-microphone');
  //   } else if (isActiveMicrophone && isMicMuted) {
  //     return t('footer.menus.unmute-microphone');
  //   }
  // };

  const onCloseMicrophoneModal = async (deviceId?: string) => {
    dispatch(updateShowMicrophoneModal(false));

    if (isEmpty(deviceId)) {
      return;
    }

    const localTracks = await createLocalTracks({
      audio: {
        deviceId: deviceId,
      },
      video: false,
    });
    for (let i = 0; i < localTracks.length; i++) {
      const track = localTracks[i];
      if (track.kind === Track.Kind.Audio) {
        await currentRoom?.localParticipant.publishTrack(track, {
          audioPreset: getAudioPreset(),
        });
        dispatch(updateIsActiveMicrophone(true));
      }
    }
    if (muteOnStart) {
      setTimeout(async () => {
        const audioTracks =
          currentRoom?.localParticipant.audioTrackPublications;

        if (audioTracks) {
          for (const [, publication] of audioTracks.entries()) {
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
          }
        }
      }, 500);
    }

    if (deviceId != null) {
      dispatch(updateSelectedAudioDevice(deviceId));
    }
  };

  return (
    <div
      className={`relative footer-icon cursor-pointer min-w-[52px] h-[52px] rounded-[20px] border-4 ${isMicMuted && isActiveMicrophone ? '!border-Red-100' : ''} ${isActiveMicrophone ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
    >
      <div
        className={`microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950 ${isMicMuted && isActiveMicrophone ? '!border-Red-200' : ''} ${
          showTooltip ? 'has-tooltip' : ''
        }`}
      >
        {/* <span className="tooltip rtl:-left-3 rtl:microphone-rtl-left">
          {getTooltipText()}
        </span> */}
        <div
          className="w-[42px] h-full relative flex items-center justify-center"
          onClick={() => manageMic()}
        >
          {!isActiveMicrophone ? (
            <>
              <Microphone classes={'h-5 w-auto'} />
              <span className="add absolute -top-2 -right-2 z-10">
                <PlusIcon />
              </span>
            </>
          ) : null}
          {!isMicMuted && isActiveMicrophone ? (
            <Microphone classes={'h-5 w-auto'} />
          ) : null}
          {isMicMuted && isActiveMicrophone ? (
            <MicrophoneOff classes={'h-5 w-auto'} />
          ) : null}

          {/* <span className="blocked absolute -top-2 -right-2 z-10">
            <BlockedIcon />
          </span> */}
        </div>
        {isActiveMicrophone ? (
          <MicMenu
            currentRoom={currentRoom}
            isActiveMicrophone={isActiveMicrophone}
            isMicMuted={isMicMuted}
          />
        ) : null}
      </div>
      {showMicrophoneModal ? (
        <MicrophoneModal
          show={showMicrophoneModal}
          onCloseMicrophoneModal={onCloseMicrophoneModal}
        />
      ) : null}
    </div>
  );
};

export default MicrophoneIcon;
