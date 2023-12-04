import React, { useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import {
  createLocalTracks,
  ParticipantEvent,
  Room,
  Track,
} from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { proto3 } from '@bufbuild/protobuf';
import { isEmpty } from 'lodash';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
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
import { sendAnalyticsByWebsocket } from '../../../helpers/websocket';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  AnalyticsStatus,
} from '../../../helpers/proto/plugnmeet_analytics_pb';
import { getAudioPreset } from '../../../helpers/utils';

interface IMicrophoneIconProps {
  currentRoom: Room;
}
const isActiveMicrophoneSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveMicrophone,
);
const showMicrophoneModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.showMicrophoneModal,
);
const isMicLockSelector = createSelector(
  (state: RootState) => state.session.currentUser?.metadata?.lock_settings,
  (lock_settings) => lock_settings?.lock_microphone,
);
const isMicMutedSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isMicMuted,
);

const MicrophoneIcon = ({ currentRoom }: IMicrophoneIconProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const session = store.getState().session;
  const showTooltip = session.userDeviceType === 'desktop';
  const muteOnStart =
    session.currentRoom.metadata?.room_features.mute_on_start ?? false;

  const showMicrophoneModal = useAppSelector(showMicrophoneModalSelector);
  const isActiveMicrophone = useAppSelector(isActiveMicrophoneSelector);
  const isMicLock = useAppSelector(isMicLockSelector);
  const isMicMuted = useAppSelector(isMicMutedSelector);

  const [lockMic, setLockMic] = useState<boolean>(false);

  // for change in mic lock setting
  useEffect(() => {
    const closeMicOnLock = async () => {
      for (const [
        ,
        publication,
      ] of currentRoom?.localParticipant.audioTracks.entries()) {
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
      store.getState().session.currentRoom.metadata?.default_lock_settings
        ?.lock_microphone;
    const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;

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
          sendAnalyticsByWebsocket(
            AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED_DURATION,
            AnalyticsEventType.USER,
            undefined,
            undefined,
            BigInt(cal),
          );
        }
      } else {
        // send analytics as user has spoken
        sendAnalyticsByWebsocket(
          AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED,
          AnalyticsEventType.USER,
          undefined,
          undefined,
          BigInt(1),
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
  }, [currentRoom]);

  const muteUnmuteMic = async () => {
    for (const [
      ,
      publication,
    ] of currentRoom?.localParticipant.audioTracks.entries()) {
      if (
        publication.track &&
        publication.track.source === Track.Source.Microphone
      ) {
        if (publication.isMuted) {
          await publication.track.unmute();
          dispatch(updateIsMicMuted(false));
          // send analytics
          sendAnalyticsByWebsocket(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            proto3.getEnumType(AnalyticsStatus).values[AnalyticsStatus.UNMUTED]
              .name,
          );
        } else {
          await publication.track.mute();
          dispatch(updateIsMicMuted(true));
          // send analytics
          sendAnalyticsByWebsocket(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            proto3.getEnumType(AnalyticsStatus).values[AnalyticsStatus.MUTED]
              .name,
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

  const getTooltipText = () => {
    if (!isActiveMicrophone && !lockMic) {
      return t('footer.icons.start-microphone-sharing');
    } else if (!isActiveMicrophone && lockMic) {
      return t('footer.icons.microphone-locked');
    }

    if (isActiveMicrophone && !isMicMuted) {
      return t('footer.menus.mute-microphone');
    } else if (isActiveMicrophone && isMicMuted) {
      return t('footer.menus.unmute-microphone');
    }
  };

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
        const audioTracks = currentRoom?.localParticipant.audioTracks;

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
    <div className="relative z-10">
      {showMicrophoneModal ? (
        <MicrophoneModal
          show={showMicrophoneModal}
          onCloseMicrophoneModal={onCloseMicrophoneModal}
        />
      ) : null}
      <div
        className={`microphone footer-icon relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] ltr:mr-3 lg:ltr:mr-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => manageMic()}
      >
        <span className="tooltip rtl:-left-3 rtl:microphone-rtl-left">
          {getTooltipText()}
        </span>

        {!isActiveMicrophone ? (
          <>
            <i className="pnm-mic-unmute primaryColor dark:text-darkText text-[12px] lg:text-[14px]" />
            {lockMic ? (
              <div className="arrow-down absolute -bottom-1 -right-1 w-[16px] h-[16px] rounded-full bg-white dark:bg-darkSecondary3 flex items-center justify-center">
                <i className="pnm-lock primaryColor dark:text-darkText" />
              </div>
            ) : null}
          </>
        ) : null}

        {!isMicMuted && isActiveMicrophone ? (
          <i className="pnm-mic-unmute secondaryColor  text-[12px] lg:text-[14px]" />
        ) : null}

        {isMicMuted && isActiveMicrophone ? (
          <i className="pnm-mic-mute secondaryColor text-[12px] lg:text-[14px]" />
        ) : null}
      </div>

      {isActiveMicrophone ? <MicMenu currentRoom={currentRoom} /> : null}
    </div>
  );
};

export default MicrophoneIcon;
