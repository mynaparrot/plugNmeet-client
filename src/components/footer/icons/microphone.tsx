import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createLocalTracks, LocalTrack, Track } from 'livekit-client';
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
import { useMicrophoneActivity } from './hooks/useMicrophoneActivity';

const MicrophoneIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentRoom = getMediaServerConnRoom();
  const conn = getNatsConn();
  const isPublishing = useRef<boolean>(false);

  const { showTooltip, isAdmin, defaultLock } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
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

  const { showMutedTooltip, onDismissTooltip, muteOnStartRef } =
    useMicrophoneActivity(currentRoom, isMicMuted);

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

  const muteUnmuteMic = useCallback(async () => {
    if (!currentRoom) {
      return;
    }
    const publication = currentRoom.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );

    if (publication && publication.track) {
      if (publication.isMuted) {
        await currentRoom.localParticipant.setMicrophoneEnabled(true);

        // send analytics
        const val = AnalyticsStatusSchema.values[AnalyticsStatus.UNMUTED];
        conn.sendAnalyticsData(
          AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
          AnalyticsEventType.USER,
          val['name'],
        );
      } else {
        await currentRoom.localParticipant.setMicrophoneEnabled(false);

        // send analytics
        const val = AnalyticsStatusSchema.values[AnalyticsStatus.MUTED];
        conn.sendAnalyticsData(
          AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
          AnalyticsEventType.USER,
          val['name'],
        );
      }
    }
  }, [currentRoom, conn]);

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

      if (isEmpty(deviceId) || !currentRoom || isPublishing.current) {
        return;
      }
      isPublishing.current = true;

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
        await currentRoom.localParticipant.publishTrack(audioTrack, {
          audioPreset: getAudioPreset(),
          source: Track.Source.Microphone,
        });
        dispatch(updateIsActiveMicrophone(true));

        if (muteOnStartRef.current) {
          await currentRoom.localParticipant.setMicrophoneEnabled(false);
          dispatch(updateIsMicMuted(true));
        }
      }
      if (deviceId != null) {
        dispatch(updateSelectedAudioDevice(deviceId));
      }
      isPublishing.current = false;
    },
    [dispatch, currentRoom, muteOnStartRef],
  );

  // only for initial if device was selected in landing page
  useEffect(() => {
    if (selectedAudioDevice) {
      sleep(500).then(() => onCloseMicrophoneModal(selectedAudioDevice));
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
                onClick={onDismissTooltip}
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
