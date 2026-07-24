import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { LocalTrack, Track } from 'livekit-client';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import ShareWebcamModal from '../modals/webcam';
import WebcamMenu from './webcam-menu';
import { updateSelectedVideoDevice } from '../../../store/slices/roomSettingsSlice';
import { createEmptyVideoStreamTrack, sleep } from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import { Camera } from '../../../assets/Icons/Camera';
import { CameraOff } from '../../../assets/Icons/CameraOff';
import { PlusIcon } from '../../../assets/Icons/PlusIcon';
import useWebcamPublisher from './hooks/useWebcamPublisher';
import {
  isHybridMode,
  muteNativeMedia,
  publishNativeMedia,
  unmuteNativeMedia,
  unpublishNativeMedia,
  useNativePublisherStatus,
} from '../../../helpers/nativeBridge';

const WebcamIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  const { t } = useTranslation();

  const { showTooltip, isAdmin, defaultLock, isWebcamAllowed } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;

    let show = true;
    if (!roomFeatures?.allowWebcams) {
      show = false;
    } else if (roomFeatures?.adminOnlyWebcams && !isAdmin) {
      show = false;
    }

    return {
      showTooltip: session.userDeviceType === 'desktop',
      isAdmin,
      defaultLock:
        !!session.currentRoom?.metadata?.defaultLockSettings?.lockWebcam,
      isWebcamAllowed: show,
    };
  }, []);
  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );
  const isActiveWebcam = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWebcam,
  );

  const hybrid = isHybridMode();
  const nativeStatus = useNativePublisherStatus();
  const nativeCam = nativeStatus.sources[NativeMediaSource.WEBCAM];
  const isActiveCam = hybrid ? nativeCam.active : isActiveWebcam;
  const isMuted = hybrid ? nativeCam.muted : !isActiveWebcam;

  const isWebcamLock = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWebcam,
  );
  const virtualBackground = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );
  const selectedVideoDevice = useAppSelector(
    (state) => state.roomSettings.selectedVideoDevice,
  );

  // Lock if not an admin & user-specific lock is set, or fall back to room default.
  const isWebcamLocked = useMemo(
    () => !isAdmin && (isWebcamLock ?? defaultLock),
    [isAdmin, isWebcamLock, defaultLock],
  );

  const { publishNewTrack, replaceTrack } = useWebcamPublisher();

  // for change in webcam lock setting
  useEffect(() => {
    if (hybrid) {
      if (isWebcamLocked) unpublishNativeMedia(NativeMediaSource.WEBCAM);
      return;
    }
    if (!currentRoom) return;

    const closeWebcamOnLock = async (cameraTrack: LocalTrack) => {
      await currentRoom.localParticipant.unpublishTrack(cameraTrack, true);
      dispatch(updateIsActiveWebcam(false));
    };

    if (isWebcamLocked) {
      const hasCameraTrack = currentRoom.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      if (hasCameraTrack && hasCameraTrack.track) {
        closeWebcamOnLock(hasCameraTrack.track).then();
      }
    }
  }, [isWebcamLocked, currentRoom, dispatch, hybrid]);

  // this is required during changing webcam device
  useEffect(() => {
    if (!selectedVideoDevice || !isActiveWebcam || !currentRoom) {
      return;
    }

    const changeDevice = async (deviceId: string) => {
      await currentRoom.switchActiveDevice('videoinput', deviceId);
    };

    if (virtualBackground.type === 'none') {
      changeDevice(selectedVideoDevice).then();
    } else {
      // virtual background stream will be handled by its own hook
    }
  }, [
    selectedVideoDevice,
    isActiveWebcam,
    currentRoom,
    virtualBackground.type,
  ]);

  const onSelectedDevice = useCallback(
    async (deviceId: string) => {
      dispatch(updateSelectedVideoDevice(deviceId));
      dispatch(updateIsActiveWebcam(true));
      await publishNewTrack(deviceId, undefined, virtualBackground);
    },
    [dispatch, publishNewTrack, virtualBackground],
  );

  // only for initial if device was selected in landing page
  useEffect(() => {
    let isSubscribed = true;
    let intervalId: NodeJS.Timeout | null = null;

    const startWebcam = (device: string) => {
      sleep(500).then(() => onSelectedDevice(device));
    };

    const initializeVideoTrack = async () => {
      if (!selectedVideoDevice) return;

      // Get the synchronous state of the selected audio device on mount to avoid dependency triggers
      const initialAudioDevice =
        store.getState().roomSettings.selectedAudioDevice;

      // If an audio device was selected, wait for its track negotiation to complete
      if (initialAudioDevice && initialAudioDevice !== '') {
        const checkMicrophoneReady = () => {
          if (!isSubscribed) return;

          const micEnabled = currentRoom?.localParticipant?.isMicrophoneEnabled;
          if (micEnabled) {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            startWebcam(selectedVideoDevice);
          }
        };

        // Check immediately first
        const micEnabled = currentRoom?.localParticipant?.isMicrophoneEnabled;
        if (micEnabled) {
          startWebcam(selectedVideoDevice);
        } else {
          // Otherwise check every 250ms until the media server negotiation completes
          intervalId = setInterval(checkMicrophoneReady, 250);
        }
      } else {
        startWebcam(selectedVideoDevice);
      }
    };

    void initializeVideoTrack();

    return () => {
      isSubscribed = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    //eslint-disable-next-line
  }, []);

  const toggleWebcam = useCallback(async () => {
    if (hybrid) {
      if (isWebcamLocked || !nativeStatus.available) return;
      if (!nativeCam.active) {
        publishNativeMedia(NativeMediaSource.WEBCAM);
      } else if (nativeCam.muted) {
        unmuteNativeMedia(NativeMediaSource.WEBCAM);
      } else {
        muteNativeMedia(NativeMediaSource.WEBCAM);
      }
      return;
    }

    if (isWebcamLocked) {
      return;
    }

    if (!isActiveWebcam) {
      if (!currentRoom) return;
      if (selectedVideoDevice !== '') {
        await onSelectedDevice(selectedVideoDevice);
      } else {
        dispatch(updateShowVideoShareModal(!isActiveWebcam));
      }
    } else if (isActiveWebcam) {
      // we'll replace it by empty Stream
      if (!currentRoom) return;
      const emptyStream = createEmptyVideoStreamTrack(
        currentRoom.localParticipant.name ?? 'User',
      );

      if (virtualBackground.type == 'none') {
        await replaceTrack(emptyStream);
      } else {
        await publishNewTrack('', emptyStream);
      }
      dispatch(updateIsActiveWebcam(false));
    }
    //oxlint-disable-next-line
  }, [
    hybrid,
    isWebcamLocked,
    nativeStatus.available,
    nativeCam.active,
    nativeCam.muted,
    isActiveWebcam,
    selectedVideoDevice,
    currentRoom,
    onSelectedDevice,
    virtualBackground,
  ]);

  const getTooltipText = () => {
    if (hybrid && !nativeStatus.available) {
      return t('footer.icons.native-publisher-unavailable');
    }
    if (!isActiveCam && !isWebcamLock) {
      return t('footer.icons.start-webcam');
    } else if (isActiveCam && isMuted) {
      return t('footer.icons.start-webcam');
    } else if (!isActiveCam && isWebcamLock) {
      return t('footer.icons.webcam-locked');
    } else if (isActiveCam && !isMuted) {
      return t('footer.icons.turn-off-webcam');
    }
  };

  const renderIcon = () => {
    if (isActiveCam) {
      if (isMuted) {
        return <CameraOff classes={'h-4 3xl:h-5 w-auto'} />;
      } else {
        return <Camera classes={'h-4 3xl:h-5 w-auto'} />;
      }
    } else {
      const showPlus =
        (hybrid && !nativeStatus.available) || selectedVideoDevice === '';
      return (
        <>
          <Camera classes={'h-4 3xl:h-5 w-auto'} />
          {showPlus ? (
            <span className="add absolute -top-2 -right-2 z-10">
              {isWebcamLocked ? (
                <i className="pnm-lock primaryColor" />
              ) : (
                <PlusIcon />
              )}
            </span>
          ) : null}
        </>
      );
    }
  };

  if (!isWebcamAllowed) {
    return null;
  }

  const wrapperClasses = clsx(
    'relative footer-icon cursor-pointer min-w-10 md:min-w-11 3xl:min-w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[20px] border-[3px] 3xl:border-4',
    {
      'border-Red-100!': !isActiveCam || isMuted,
      'border-[rgba(124,206,247,0.25)]': isActiveCam && !isMuted,
      'border-transparent': !isActiveCam,
      'border-Red-100! dark:!border-Red-600 pointer-events-none':
        isWebcamLocked,
    },
  );

  const camWrapClasses = clsx(
    'footer-icon-bg cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 dark:border-Gray-700 rounded-[12px] 3xl:rounded-2xl h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white bg-white dark:bg-Gray-800',
    {
      'border-Red-200!': !isActiveCam || isMuted,
      'border-Red-200! dark:!border-Red-400 text-Red-400': isWebcamLocked,
    },
  );

  const iconDivClasses = clsx(
    'w-[32px] md:w-[36px] 3xl:w-[42px] h-full relative flex items-center justify-center cursor-pointer',
    {
      'has-tooltip': showTooltip,
      'pointer-events-none opacity-50':
        hybrid && !nativeStatus.available && !isWebcamLocked,
    },
  );

  return (
    <>
      <div className={wrapperClasses}>
        <div className={camWrapClasses}>
          <button
            type="button"
            className={iconDivClasses}
            onClick={() => toggleWebcam()}
          >
            <span className="tooltip">{getTooltipText()}</span>
            {renderIcon()}
          </button>
          {isActiveCam && (
            <WebcamMenu
              currentRoom={currentRoom}
              isHybrid={hybrid}
              toggleWebcam={toggleWebcam}
            />
          )}
        </div>
      </div>

      {showVideoShareModal && (
        <ShareWebcamModal
          onSelectedDevice={onSelectedDevice}
          selectedDeviceId={selectedVideoDevice}
          displayWebcamSelection={true}
        />
      )}
    </>
  );
};

export default WebcamIcon;
