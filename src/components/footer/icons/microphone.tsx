import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createAudioAnalyser,
  createLocalTracks,
  LocalAudioTrack,
  LocalTrack,
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
import {
  getAudioPreset,
  getInputMediaDevices,
  sleep,
} from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import { getNatsConn } from '../../../helpers/nats';
import { Microphone } from '../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../assets/Icons/MicrophoneOff';
import { PlusIcon } from '../../../assets/Icons/PlusIcon';
import { CloseIconSVG } from '../../../assets/Icons/CloseIconSVG';

const MicrophoneIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentRoom = getMediaServerConnRoom();
  const conn = getNatsConn();

  const [showMutedTooltip, setShowMutedTooltip] = useState(false);
  const tooltipDismissedRef = useRef(false);
  const isMutedRef = useRef(false);
  const muteDelayTimer = useRef<NodeJS.Timeout | null>(null);

  const { showTooltip, muteOnStart, isAdmin, defaultLock } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      muteOnStart: !!session.currentRoom.metadata?.roomFeatures?.muteOnStart,
      isAdmin: !!session.currentUser?.metadata?.isAdmin,
      defaultLock:
        !!session.currentRoom?.metadata?.defaultLockSettings?.lockMicrophone,
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

  // Lock if not an admin & user-specific lock is set, or fall back to room default.
  const isLocked = useMemo(
    () => !isAdmin && (isMicLock ?? defaultLock),
    [isAdmin, isMicLock, defaultLock],
  );

  // for change in mic lock setting
  useEffect(() => {
    if (!currentRoom) return;

    const closeMicOnLock = async (micTrack: LocalTrack) => {
      await currentRoom.localParticipant.unpublishTrack(micTrack, true);
      dispatch(updateIsActiveMicrophone(false));
      dispatch(updateIsMicMuted(false));
    };

    if (isLocked) {
      const mic = currentRoom.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      if (mic && mic.track) {
        closeMicOnLock(mic.track).then();
      }
    }
  }, [isLocked, currentRoom, dispatch]);

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

  // for speaking to send stats & muted tooltip
  useEffect(() => {
    if (!currentRoom) {
      return;
    }

    let interval: any;
    let cleanupAnalyser: (() => void) | undefined;

    const setupAnalyser = (publication: LocalTrackPublication) => {
      if (publication.kind !== Track.Kind.Audio) {
        return;
      }
      // Reset dismissed state for the new track session.
      tooltipDismissedRef.current = false;

      const track = publication.track as LocalAudioTrack;
      const { calculateVolume, cleanup } = createAudioAnalyser(track, {
        cloneTrack: true,
      });
      cleanupAnalyser = cleanup; // Store the cleanup function for this track.

      interval = setInterval(() => {
        const volume = calculateVolume();
        if (
          isMutedRef.current &&
          volume > 0.2 &&
          !tooltipDismissedRef.current
        ) {
          setShowMutedTooltip(true);
        } else {
          // Ensure we hide the tooltip if conditions are no longer met.
          setShowMutedTooltip(false);
        }
      }, 500);
    };

    // This function now encapsulates the entire teardown.
    const teardownAnalyser = async () => {
      if (muteDelayTimer.current) {
        clearTimeout(muteDelayTimer.current);
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (cleanupAnalyser) {
        cleanupAnalyser();
        cleanupAnalyser = undefined;
      }
      await sleep(200);
      setShowMutedTooltip(false);
      tooltipDismissedRef.current = false;
    };

    const onTrackMuted = () => {
      // Don't start immediately
      muteDelayTimer.current = setTimeout(() => {
        isMutedRef.current = true;
      }, 3000);
    };

    const onTrackUnmuted = () => {
      // If a timer is pending, cancel it.
      if (muteDelayTimer.current) {
        clearTimeout(muteDelayTimer.current);
      }
      // Immediately disarm the mute check.
      isMutedRef.current = false;
      setShowMutedTooltip(false);
      tooltipDismissedRef.current = false;
    };

    // Attach all event listeners.
    currentRoom.localParticipant.on(
      ParticipantEvent.IsSpeakingChanged,
      speakingHandler,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackPublished,
      setupAnalyser,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackUnpublished,
      teardownAnalyser,
    );
    currentRoom.localParticipant.on(ParticipantEvent.TrackMuted, onTrackMuted);
    currentRoom.localParticipant.on(
      ParticipantEvent.TrackUnmuted,
      onTrackUnmuted,
    );

    // Main cleanup for when the component unmounts.
    return () => {
      // Detach all listeners.
      currentRoom.localParticipant.off(
        ParticipantEvent.IsSpeakingChanged,
        speakingHandler,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackPublished,
        setupAnalyser,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackUnpublished,
        teardownAnalyser,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackMuted,
        onTrackMuted,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackUnmuted,
        onTrackUnmuted,
      );
      // Final, robust cleanup.
      teardownAnalyser().then();
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
      // get devices before showing the modal
      const devices = await getInputMediaDevices('audio');
      dispatch(addAudioDevices(devices.audio));

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

      const audioTrack = localTracks.find(
        (track) => track.kind === Track.Kind.Audio,
      );

      if (audioTrack) {
        if (muteOnStart) {
          // Mute the track before publishing to prevent any audio leak.
          await audioTrack.mute();
          dispatch(updateIsMicMuted(true));
          // We'll disable it as it was for the first time only.
          dispatch(updateMuteOnStart(false));
        }

        await currentRoom.localParticipant.publishTrack(audioTrack, {
          audioPreset: getAudioPreset(),
        });
        dispatch(updateIsActiveMicrophone(true));
      }

      if (deviceId != null) {
        dispatch(updateSelectedAudioDevice(deviceId));
      }
    },
    [dispatch, currentRoom, muteOnStart],
  );

  // only for initial if device was selected in landing page
  useEffect(() => {
    if (selectedAudioDevice) {
      onCloseMicrophoneModal(selectedAudioDevice).then();
    }
    //eslint-disable-next-line
  }, [onCloseMicrophoneModal]);

  const wrapperClasses = clsx(
    'relative footer-icon cursor-pointer min-w-10 md:min-w-11 3xl:min-w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[20px] border-[3px] 3xl:border-4',
    {
      'border-Red-100!': isMicMuted && isActiveMicrophone,
      'border-[rgba(124,206,247,0.25)]': isActiveMicrophone,
      'border-transparent': !isActiveMicrophone,
      'border-Red-100! dark:!border-Red-600 pointer-events-none': isLocked,
    },
  );

  const micWrapClasses = clsx(
    'footer-icon-bg microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 dark:border-Gray-700 rounded-[12px] 3xl:rounded-2xl h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white bg-white dark:bg-Gray-800',
    {
      'border-Red-200!': isMicMuted && isActiveMicrophone,
      'border-Red-200! dark:!border-Red-400 text-Red-400': isLocked,
    },
  );

  const iconDivClasses = clsx(
    'w-[32px] md:w-[36px] 3xl:w-[42px] h-full relative flex items-center justify-center',
    {
      'has-tooltip': showTooltip,
    },
  );

  return (
    <>
      <div className={wrapperClasses}>
        {showMutedTooltip && (
          <div className="micro-muted-tooltip tooltip-left absolute -left-3 rtl:microphone-rtl-left bottom-[48px] 3xl:bottom-[55px]">
            <div className="inner w-max bg-Gray-50 dark:bg-dark-secondary2 rounded-lg shadow-lg px-4 pr-6 py-4 flex items-center gap-2 relative">
              <MicrophoneOff classes={'h-4 3xl:h-5 w-auto text-Red-600'} />
              <p className="text-sm text-gray-900 dark:text-white">
                {t('footer.icons.you-are-muted')}
              </p>
              <button
                className="text-gray-950 dark:text-white absolute cursor-pointer top-1 right-1"
                onClick={() => {
                  tooltipDismissedRef.current = true;
                  setShowMutedTooltip(false);
                }}
              >
                <CloseIconSVG />
              </button>
            </div>
          </div>
        )}
        <div className={micWrapClasses}>
          <div className={iconDivClasses} onClick={manageMic}>
            <span className="tooltip tooltip-left -left-3 rtl:microphone-rtl-left">
              {getTooltipText()}
            </span>
            {!isActiveMicrophone ? (
              <>
                <Microphone classes={'h-4 3xl:h-5 w-auto'} />
                <span className="add absolute -top-1.5 md:-top-2 -right-1.5 md:-right-2 z-10">
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
