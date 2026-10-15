import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createLocalTracks, LocalAudioTrack, LocalTrack, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';
import clsx from 'clsx';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateShowMicrophoneModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import MicMenu from './mic-menu';
import MicrophoneModal from '../modals/microphone';
import {
  addAudioDevices,
  addUserNotification,
  updateMicrophoneConfig,
  updateSelectedAudioDevice,
} from '../../../store/slices/roomSettingsSlice';
import { getAudioPreset, sleep } from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import {
  applyNoiseSuppressorState,
  disableNoiseSuppressor,
} from '../../../helpers/libs/NoiseSuppressorTrackProcessor';
import { Microphone } from '../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../assets/Icons/MicrophoneOff';
import { PlusIcon } from '../../../assets/Icons/PlusIcon';
import { CloseIconSVG } from '../../../assets/Icons/CloseIconSVG';
import { useMicrophoneActivity } from './hooks/useMicrophoneActivity';
import {
  isHybridMode,
  publishNativeMedia,
  muteNativeMedia,
  unmuteNativeMedia,
  useNativePublisherStatus,
} from '../../../helpers/nativeBridge';

const MicrophoneIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentRoom = getMediaServerConnRoom();
  const isPublishing = useRef<boolean>(false);

  const { showTooltip, isAdmin, defaultLock } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      isAdmin: !!session.currentUser?.metadata?.isAdmin,
      defaultLock: !!session.currentRoom?.metadata?.defaultLockSettings?.lockMicrophone,
    };
  }, []);

  const showMicrophoneModal = useAppSelector(
    (state) => state.bottomIconsActivity.showMicrophoneModal,
  );
  const isActiveMicrophone = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveMicrophone,
  );
  const isMicLock = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const isMicMuted = useAppSelector((state) => state.bottomIconsActivity.isMicMuted);
  const selectedAudioDevice = useAppSelector((state) => state.roomSettings.selectedAudioDevice);
  const knownAudioDevices = useAppSelector((state) => state.roomSettings.audioDevices);

  const hybrid = isHybridMode();
  const { available: nativeAvailable } = useNativePublisherStatus();

  const { showMutedTooltip, onDismissTooltip, muteOnStartRef } = useMicrophoneActivity(
    currentRoom,
    isMicMuted,
  );

  // Lock if not an admin & user-specific lock is set, or fall back to room default.
  const isLocked = useMemo(
    () => !isAdmin && (isMicLock ?? defaultLock),
    [isAdmin, isMicLock, defaultLock],
  );

  // for change in mic lock setting
  // NOTE: native lock handled in useHybridLockForwarder (nativeBridge/hooks.ts)
  useEffect(() => {
    if (!currentRoom) return;

    const closeMicOnLock = async (micTrack: LocalTrack) => {
      await currentRoom.localParticipant.unpublishTrack(micTrack, true);
      dispatch(updateIsActiveMicrophone(false));
      dispatch(updateIsMicMuted(false));
    };

    if (isLocked) {
      const mic = currentRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (mic && mic.track) {
        closeMicOnLock(mic.track).then();
      }
    }
  }, [isLocked, currentRoom, dispatch]);

  const muteUnmuteMic = useCallback(async () => {
    if (!currentRoom) {
      return;
    }
    const publication = currentRoom.localParticipant.getTrackPublication(Track.Source.Microphone);

    if (publication && publication.track) {
      if (publication.isMuted) {
        await currentRoom.localParticipant.setMicrophoneEnabled(true);
      } else {
        await currentRoom.localParticipant.setMicrophoneEnabled(false);
      }
    }
  }, [currentRoom]);

  const manageMic = useCallback(async () => {
    if (hybrid) {
      if (isLocked || !nativeAvailable) return;
      if (!isActiveMicrophone) {
        publishNativeMedia(NativeMediaSource.MIC);
      } else if (isMicMuted) {
        unmuteNativeMedia(NativeMediaSource.MIC);
      } else {
        muteNativeMedia(NativeMediaSource.MIC);
      }
      return;
    }

    if (!isActiveMicrophone && !isLocked) {
      // Picker enumerates + sorts itself; don't pre-fill [0] here.
      dispatch(updateShowMicrophoneModal(true));
    }

    if (isActiveMicrophone) {
      await muteUnmuteMic();
    }
  }, [isActiveMicrophone, isMicMuted, isLocked, dispatch, muteUnmuteMic, hybrid, nativeAvailable]);

  const getTooltipText = () => {
    if (hybrid && !nativeAvailable) {
      return t('footer.icons.native-publisher-unavailable');
    }
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

  const reportNoiseSuppressionFailure = useCallback(() => {
    dispatch(updateMicrophoneConfig({ noiseSuppression: false }));
    dispatch(
      addUserNotification({
        message: t('footer.modal.noise-suppression-failed'),
        typeOption: 'error',
      }),
    );
  }, [dispatch, t]);

  /**
   * Applies the requested GTCRN state to the live mic track. Returns whether it
   * succeeded and persists the *truthful* resulting state, so the switch never
   * shows suppression as on/off when the processor isn't.
   */
  const setTrackNoiseSuppression = useCallback(
    async (track: LocalAudioTrack, desired: boolean): Promise<boolean> => {
      const room = getMediaServerConnRoom();
      const isCurrent = () =>
        room?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track === track;

      const ok = await applyNoiseSuppressorState(track, desired, isCurrent, () => {
        // Asynchronous worklet failure: detach and flip the preference off.
        void disableNoiseSuppressor(track).finally(reportNoiseSuppressionFailure);
      });

      if (ok) {
        dispatch(updateMicrophoneConfig({ noiseSuppression: desired }));
        return true;
      }
      // Enable failures leave it off, disable failures leave it on.
      dispatch(updateMicrophoneConfig({ noiseSuppression: !desired }));
      dispatch(
        addUserNotification({
          message: t('footer.modal.noise-suppression-failed'),
          typeOption: 'error',
        }),
      );
      return false;
    },
    [dispatch, reportNoiseSuppressionFailure, t],
  );

  const onCloseMicrophoneModal = useCallback(
    async (deviceId?: string) => {
      dispatch(updateShowMicrophoneModal(false));

      if (!currentRoom) {
        return;
      }

      const activeTrack = currentRoom.localParticipant.getTrackPublication(Track.Source.Microphone)
        ?.track as LocalAudioTrack | undefined;

      // Already publishing: never recapture/republish the mic. A device swap is
      // routed through LiveKit so the processor lifecycle stays intact.
      if (activeTrack) {
        if (deviceId && deviceId !== selectedAudioDevice) {
          await currentRoom.switchActiveDevice('audioinput', deviceId);
          dispatch(updateSelectedAudioDevice(deviceId));
        }
        return;
      }

      if (isEmpty(deviceId) || isPublishing.current) {
        return;
      }
      isPublishing.current = true;

      let audioTrack: LocalTrack | undefined;
      let published = false;
      try {
        const localTracks = await createLocalTracks({
          audio: {
            deviceId: deviceId,
          },
          video: false,
        });

        audioTrack = localTracks.find((track) => track.kind === Track.Kind.Audio);

        if (audioTrack) {
          await currentRoom.localParticipant.publishTrack(audioTrack, {
            audioPreset: getAudioPreset(),
            source: Track.Source.Microphone,
          });
          published = true;

          // Attach only after the SDK owns the published track, because
          // `setProcessor` runs on the SDK's own AudioContext, which doesn't
          // exist until then. Read the preference fresh (not from a stale
          // closure) so the very first publish honours the current config.
          const wantNoiseSuppression =
            store.getState().roomSettings.microphoneConfig.noiseSuppression;
          if (wantNoiseSuppression && audioTrack instanceof LocalAudioTrack) {
            await setTrackNoiseSuppression(audioTrack, true);
          }

          // Flip the mic "active" only once the initial attach has settled: the
          // modal's live toggle keys off isActiveMicrophone, so exposing it
          // earlier would let the user toggle suppression while this attach is
          // still in flight and race the candidate.
          dispatch(updateIsActiveMicrophone(true));

          if (muteOnStartRef.current) {
            await currentRoom.localParticipant.setMicrophoneEnabled(false);
            dispatch(updateIsMicMuted(true));
          }
        }
        if (deviceId != null) {
          dispatch(updateSelectedAudioDevice(deviceId));
        }
      } catch (e) {
        console.error(e);
        // Drop the candidate we captured so a failed publish leaves no live mic.
        if (!published) {
          audioTrack?.stop();
        }
      } finally {
        isPublishing.current = false;
      }
    },
    [dispatch, currentRoom, muteOnStartRef, selectedAudioDevice, setTrackNoiseSuppression],
  );

  /** Live toggle callback for the mic modal; the modal guards repeated clicks. */
  const onNoiseSuppressionChange = useCallback(
    async (desired: boolean): Promise<boolean> => {
      const room = getMediaServerConnRoom();
      const track = room?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as
        | LocalAudioTrack
        | undefined;
      if (!track) {
        // No live mic (inactive/landing): nothing to process, just persist it.
        dispatch(updateMicrophoneConfig({ noiseSuppression: desired }));
        return true;
      }
      return setTrackNoiseSuppression(track, desired);
    },
    [dispatch, setTrackNoiseSuppression],
  );

  // only for initial if device was selected in landing page
  const didInitialAutoPublish = useRef(false);
  useEffect(() => {
    if (didInitialAutoPublish.current) {
      return;
    }
    didInitialAutoPublish.current = true;
    if (selectedAudioDevice) {
      sleep(500).then(() => onCloseMicrophoneModal(selectedAudioDevice));
    }
    //eslint-disable-next-line
  }, []);

  const wrapperClasses = clsx(
    'relative footer-icon cursor-pointer min-w-10 md:min-w-11 3xl:min-w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[20px] border-[3px] 3xl:border-4',
    {
      'border-Red-100!': isMicMuted && isActiveMicrophone,
      'border-[rgba(124,206,247,0.25)]': isActiveMicrophone,
      'border-transparent': !isActiveMicrophone,
      'border-Red-100! dark:!border-Red-600 cursor-not-allowed': isLocked,
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
    'w-[32px] md:w-[36px] 3xl:w-[42px] h-full relative flex items-center justify-center cursor-pointer',
    {
      'focus-ring': true,
      'has-tooltip': showTooltip,
      'cursor-not-allowed opacity-50': hybrid && !nativeAvailable && !isLocked,
    },
  );

  return (
    <>
      <div className={wrapperClasses}>
        {showMutedTooltip && (
          <div className="micro-muted-tooltip tooltip-left absolute -start-3 rtl:microphone-rtl-left bottom-[48px] 3xl:bottom-[55px]">
            <div className="inner w-max bg-Gray-50 dark:bg-dark-secondary2 rounded-lg shadow-lg px-4 pe-6 py-4 flex items-center gap-2 relative">
              <MicrophoneOff classes={'h-4 3xl:h-5 w-auto text-Red-600'} />
              <p className="text-sm text-gray-900 dark:text-white">
                {t('footer.icons.you-are-muted')}
              </p>
              <button
                className="text-gray-950 dark:text-white absolute cursor-pointer top-1 end-1"
                onClick={onDismissTooltip}
              >
                <CloseIconSVG />
              </button>
            </div>
          </div>
        )}
        <div className={micWrapClasses}>
          <button
            type="button"
            className={iconDivClasses}
            onClick={manageMic}
            aria-label={getTooltipText()}
          >
            <span className="tooltip tooltip-left -start-3 rtl:microphone-rtl-left">
              {getTooltipText()}
            </span>
            {!isActiveMicrophone ? (
              <>
                <Microphone classes={'h-4 3xl:h-5 w-auto'} />
                <span className="add absolute -top-1.5 md:-top-2 -end-1.5 md:-end-2 z-10">
                  {isLocked ? <i className="pnm-lock primaryColor" /> : <PlusIcon />}
                </span>
              </>
            ) : null}
            {!isMicMuted && isActiveMicrophone && <Microphone classes={'h-4 3xl:h-5 w-auto'} />}
            {isMicMuted && isActiveMicrophone && <MicrophoneOff classes={'h-4 3xl:h-5 w-auto'} />}
          </button>
          {isActiveMicrophone && (
            <MicMenu
              currentRoom={currentRoom}
              isActiveMicrophone={isActiveMicrophone}
              isMicMuted={isMicMuted}
              hybrid={hybrid}
              isLocked={isLocked}
            />
          )}
        </div>
      </div>
      {showMicrophoneModal && (
        <MicrophoneModal
          show={showMicrophoneModal}
          initialDeviceId={selectedAudioDevice}
          initialDevices={knownAudioDevices}
          onCloseMicrophoneModal={onCloseMicrophoneModal}
          onDevicesLoaded={(devices) => dispatch(addAudioDevices(devices))}
          onNoiseSuppressionChange={onNoiseSuppressionChange}
        />
      )}
    </>
  );
};

export default MicrophoneIcon;
