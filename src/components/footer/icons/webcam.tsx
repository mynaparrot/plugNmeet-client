import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
// oxlint-disable-next-line no-unused-vars
import { LocalTrack, Track } from 'livekit-client';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
  updateVirtualBackground,
} from '../../../store/slices/bottomIconsActivitySlice';
import ShareWebcamModal from '../modals/webcam';
import WebcamMenu from './webcam/menu';
import { updateSelectedVideoDevice } from '../../../store/slices/roomSettingsSlice';
import VirtualBackground from '../../virtual-background/virtualBackground';
import { createEmptyVideoStreamTrack } from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import { Camera } from '../../../assets/Icons/Camera';
import { CameraOff } from '../../../assets/Icons/CameraOff';
import { PlusIcon } from '../../../assets/Icons/PlusIcon';
import useWebcamPublisher from './webcam/useWebcamPublisher';
import useVirtualBackground from './webcam/useVirtualBackground';

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
  const { sourcePlayback, virtualBgVideoPlayer, handleVirtualBgVideoOnLoad } =
    useVirtualBackground(
      virtualBackground.type !== 'none' ? selectedVideoDevice : undefined,
    );

  // for change in webcam lock setting
  useEffect(() => {
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
  }, [isWebcamLocked, currentRoom, dispatch]);

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
    // eslint-disable-next-line
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
      if (virtualBackground.type === 'none') {
        await publishNewTrack(deviceId);
      }
    },
    [dispatch, publishNewTrack, virtualBackground.type],
  );

  // only for initial if device was selected in landing page
  useEffect(() => {
    if (selectedVideoDevice) {
      onSelectedDevice(selectedVideoDevice).then();
    }
    //eslint-disable-next-line
  }, []);

  const toggleWebcam = useCallback(async () => {
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
      await checkPreviousCameraTrackAndReplace(emptyStream);

      dispatch(updateIsActiveWebcam(false));
      dispatch(
        updateVirtualBackground({
          type: 'none',
        }),
      );
    }
    //eslint-disable-next-line
  }, [
    isWebcamLocked,
    isActiveWebcam,
    selectedVideoDevice,
    dispatch,
    currentRoom,
    onSelectedDevice,
  ]);

  const checkPreviousCameraTrackAndReplace = useCallback(
    async (newTrack: MediaStreamTrack): Promise<boolean> => {
      return await replaceTrack(newTrack);
    },
    [replaceTrack],
  );

  // handle virtual background canvas
  const onCanvasRef = useCallback(
    async (canvasRef: React.RefObject<HTMLCanvasElement>) => {
      if (!canvasRef.current) {
        return;
      }
      const stream = canvasRef.current.captureStream(25);
      for (const track of stream.getTracks()) {
        if (track.kind === 'video') {
          const replaced = await replaceTrack(track);
          if (!replaced && currentRoom) {
            await currentRoom.localParticipant.publishTrack(track, {
              source: Track.Source.Camera,
              name: 'canvas',
            });
          }
          dispatch(updateIsActiveWebcam(true));
        }
      }
    },
    [replaceTrack, currentRoom, dispatch],
  );

  const getTooltipText = () => {
    if (!isActiveWebcam && !isWebcamLock) {
      return t('footer.icons.start-webcam');
    } else if (!isActiveWebcam && isWebcamLock) {
      return t('footer.icons.webcam-locked');
    } else if (isActiveWebcam) {
      return t('footer.icons.leave-webcam');
    }
  };

  if (!isWebcamAllowed) {
    return null;
  }

  const wrapperClasses = clsx(
    'relative footer-icon cursor-pointer min-w-11 3xl:min-w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[20px] border-[3px] 3xl:border-4',
    {
      'border-Red-100!': !isActiveWebcam && selectedVideoDevice !== '',
      'border-[rgba(124,206,247,0.25)]': isActiveWebcam,
      'border-transparent': !isActiveWebcam,
      'border-Red-100! pointer-events-none': isWebcamLocked,
    },
  );

  const camWrapClasses = clsx(
    'cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-[12px] 3xl:rounded-2xl h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950',
    {
      'border-Red-200!': !isActiveWebcam && selectedVideoDevice !== '',
      'border-Red-200! text-Red-400': isWebcamLocked,
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
        <div className={camWrapClasses}>
          <div className={iconDivClasses} onClick={() => toggleWebcam()}>
            <span className="tooltip">{getTooltipText()}</span>
            {isActiveWebcam ? <Camera classes={'h-4 3xl:h-5 w-auto'} /> : null}
            {!isActiveWebcam && (
              <>
                {selectedVideoDevice === '' ? (
                  <>
                    <Camera classes={'h-4 3xl:h-5 w-auto'} />
                    <span className="add absolute -top-2 -right-2 z-10">
                      {isWebcamLocked ? (
                        <i className="pnm-lock primaryColor" />
                      ) : (
                        <PlusIcon />
                      )}
                    </span>
                  </>
                ) : (
                  <CameraOff classes={'h-4 3xl:h-5 w-auto'} />
                )}
              </>
            )}
          </div>
          {isActiveWebcam && (
            <WebcamMenu
              currentRoom={currentRoom}
              isActiveWebcam={isActiveWebcam}
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

      {/*For virtual background*/}
      {sourcePlayback &&
        selectedVideoDevice &&
        virtualBackground.type !== 'none' && (
          <div style={{ display: 'none' }}>
            <VirtualBackground
              sourcePlayback={sourcePlayback}
              id={selectedVideoDevice}
              backgroundConfig={virtualBackground}
              onCanvasRef={onCanvasRef}
            />
          </div>
        )}
      {virtualBackground.type !== 'none' && (
        <div style={{ display: 'none' }}>
          <video
            ref={virtualBgVideoPlayer}
            autoPlay
            onLoadedData={handleVirtualBgVideoOnLoad}
          />
        </div>
      )}
    </>
  );
};

export default WebcamIcon;
