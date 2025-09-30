import React, { useCallback, useEffect, useMemo } from 'react';
import {
  createLocalTracks,
  LocalTrackPublication,
  ParticipantEvent,
  Track,
} from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';
import clsx from 'clsx';
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
import MicrophoneModal from '../modals/microphoneModal';
import { updateMuteOnStart } from '../../../store/slices/sessionSlice';
import {
  addAudioDevices,
  updateSelectedAudioDevice,
} from '../../../store/slices/roomSettingsSlice';
import { getAudioPreset, getInputMediaDevices } from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import { getNatsConn } from '../../../helpers/nats';
import { Microphone } from '../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../assets/Icons/MicrophoneOff';
import { PlusIcon } from '../../../assets/Icons/PlusIcon';

const MicrophoneIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  const { t } = useTranslation();
  const conn = getNatsConn();

  const { showTooltip, muteOnStart, isAdmin } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      muteOnStart:
        session.currentRoom.metadata?.roomFeatures?.muteOnStart ?? false,
      isAdmin: !!session.currentUser?.metadata?.isAdmin,
      isRecorder: !!session.currentUser?.isRecorder,
    };
  }, []);

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

  const isLocked = useMemo(() => !isAdmin && isMicLock, [isAdmin, isMicLock]);

  // for change in mic lock setting
  useEffect(() => {
    const closeMicOnLock = async (publication: LocalTrackPublication) => {
      if (publication.track && publication.source === Track.Source.Microphone) {
        await currentRoom.localParticipant.unpublishTrack(
          publication.track,
          true,
        );
      }

      dispatch(updateIsActiveMicrophone(false));
      dispatch(updateIsMicMuted(false));
    };

    if (isLocked) {
      if (!currentRoom) {
        return;
      }
      const mic = currentRoom.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      if (mic) {
        closeMicOnLock(mic).then();
      }
    }
  }, [isLocked, currentRoom, dispatch]);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.defaultLockSettings
        ?.lockMicrophone;
    const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

    if (isLock && !isAdmin && isMicLock !== false) {
      // we don't need to do anything as `isLocked` will be true
    }
    // eslint-disable-next-line
  }, []);

  const speakingHandler = useCallback(
    (speaking: boolean) => {
      if (!currentRoom) {
        return;
      }
      if (!speaking) {
        const lastSpokeAt = currentRoom.localParticipant.lastSpokeAt?.getTime();
        if (lastSpokeAt) {
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
    },
    [currentRoom, conn],
  );

  // for speaking to send stats
  useEffect(() => {
    if (!currentRoom) {
      return;
    }

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
  }, [currentRoom, speakingHandler]);

  const muteUnmuteMic = useCallback(async () => {
    if (!currentRoom) {
      return;
    }
    for (const publication of currentRoom.localParticipant.audioTrackPublications.values()) {
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
  }, [currentRoom, conn, dispatch]);

  const manageMic = useCallback(async () => {
    if (!isActiveMicrophone && !isLocked) {
      dispatch(updateShowMicrophoneModal(true));
    }

    if (isActiveMicrophone) {
      await muteUnmuteMic();
    }
  }, [isActiveMicrophone, isLocked, dispatch, muteUnmuteMic]);

  const getTooltipText = () => {
    if (!isActiveMicrophone && !isLocked) {
      return t('footer.icons.start-microphone-sharing');
    } else if (!isActiveMicrophone && isLocked) {
      return t('footer.icons.microphone-locked');
    }

    if (isActiveMicrophone && !isMicMuted) {
      return t('footer.menus.mute-microphone');
    } else if (isActiveMicrophone && isMicMuted) {
      return t('footer.menus.unmute-microphone');
    }
  };

  const onCloseMicrophoneModal = useCallback(
    async (deviceId?: string) => {
      dispatch(updateShowMicrophoneModal(false));

      if (isEmpty(deviceId) || !currentRoom) {
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
          await currentRoom.localParticipant.publishTrack(track, {
            audioPreset: getAudioPreset(),
          });
          dispatch(updateIsActiveMicrophone(true));
        }
      }
      if (muteOnStart) {
        setTimeout(async () => {
          const audioTracks =
            currentRoom.localParticipant.audioTrackPublications;

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
    },
    [dispatch, currentRoom, muteOnStart],
  );

  // initially only
  useEffect(() => {
    const getDevices = async () => {
      const devices = await getInputMediaDevices('audio');
      dispatch(addAudioDevices(devices.audio));
      if (selectedAudioDevice) {
        onCloseMicrophoneModal(selectedAudioDevice).then();
      }
    };
    getDevices().then();
    //eslint-disable-next-line
  }, [onCloseMicrophoneModal]);

  const wrapperClasses = clsx(
    'relative footer-icon cursor-pointer min-w-11 3xl:min-w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[20px] border-[3px] 3xl:border-4',
    {
      'border-Red-100!': isMicMuted && isActiveMicrophone,
      'border-[rgba(124,206,247,0.25)]': isActiveMicrophone,
      'border-transparent': !isActiveMicrophone,
      'border-Red-100! pointer-events-none': isLocked,
    },
  );

  const micWrapClasses = clsx(
    'microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-[12px] 3xl:rounded-2xl h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950',
    {
      'border-Red-200!': isMicMuted && isActiveMicrophone,
      'border-Red-200! text-Red-400': isLocked,
    },
  );

  const iconDivClasses = clsx(
    'w-[36px] 3xl:w-[42px] h-full relative flex items-center justify-center',
    {
      'has-tooltip': showTooltip,
    },
  );

  return (
    <>
      <div className={wrapperClasses}>
        <div className={micWrapClasses}>
          <div className={iconDivClasses} onClick={manageMic}>
            <span className="tooltip tooltip-left -left-3 rtl:microphone-rtl-left">
              {getTooltipText()}
            </span>
            {!isActiveMicrophone ? (
              <>
                <Microphone classes={'h-4 3xl:h-5 w-auto'} />
                <span className="add absolute -top-2 -right-2 z-10">
                  {isLocked ? (
                    <i className="pnm-lock primaryColor" />
                  ) : (
                    <PlusIcon />
                  )}
                </span>
              </>
            ) : null}
            {!isMicMuted && isActiveMicrophone && (
              <Microphone classes={'h-4 3xl:h-5 w-auto'} />
            )}
            {isMicMuted && isActiveMicrophone && (
              <MicrophoneOff classes={'h-4 3xl:h-5 w-auto'} />
            )}
          </div>
          {isActiveMicrophone && (
            <MicMenu
              currentRoom={currentRoom}
              isActiveMicrophone={isActiveMicrophone}
              isMicMuted={isMicMuted}
            />
          )}
        </div>
      </div>
      {showMicrophoneModal && (
        <MicrophoneModal
          show={showMicrophoneModal}
          onCloseMicrophoneModal={onCloseMicrophoneModal}
        />
      )}
    </>
  );
};

export default MicrophoneIcon;
