import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createLocalVideoTrack, Track } from 'livekit-client';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import ShareWebcamModal from '../modals/webcam';
import WebcamMenu from './webcam-menu';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { updateSelectedVideoDevice } from '../../../store/slices/roomSettingsSlice';
import VirtualBackground from '../../virtual-background/virtualBackground';
import { SourcePlayback } from '../../virtual-background/helpers/sourceHelper';
import {
  createEmptyVideoStreamTrack,
  getWebcamResolution,
} from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import { Camera } from '../../../assets/Icons/Camera';
import { CameraOff } from '../../../assets/Icons/CameraOff';
import { PlusIcon } from '../../../assets/Icons/PlusIcon';

const WebcamIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();

  // we don't need this for small devices
  const showTooltip = store.getState().session.userDeviceType === 'desktop';

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
  const { t } = useTranslation();

  const [lockWebcam, setLockWebcam] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>();
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [virtualBgLocalTrack, setVirtualBgLocalTrack] = useState<MediaStream>();
  const virtualBgVideoPlayer = useRef<HTMLVideoElement>(null);

  // for change in webcam lock setting
  useEffect(() => {
    const closeMicOnLock = async () => {
      for (const [
        ,
        publication,
        // eslint-disable-next-line no-unsafe-optional-chaining
      ] of currentRoom?.localParticipant.videoTrackPublications.entries()) {
        if (publication.track && publication.source === Track.Source.Camera) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }
      dispatch(updateIsActiveWebcam(false));
    };

    if (isWebcamLock) {
      setLockWebcam(true);
      const currentUser = participantsSelector.selectById(
        store.getState(),
        currentRoom.localParticipant.identity,
      );
      if (currentUser?.videoTracks) {
        closeMicOnLock().then();
      }
    } else {
      setLockWebcam(false);
    }
  }, [isWebcamLock, currentRoom, dispatch]);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.defaultLockSettings
        ?.lockWebcam;
    const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

    if (isLock && !isAdmin) {
      if (isWebcamLock !== false) {
        setLockWebcam(true);
      }
    }
    // eslint-disable-next-line
  }, []);

  // we should check & close track
  useEffect(() => {
    if (!isActiveWebcam && virtualBgLocalTrack && !selectedVideoDevice) {
      virtualBgLocalTrack.getTracks().forEach((t) => t.stop());
    }
    if (!isActiveWebcam && !selectedVideoDevice && deviceId) {
      setDeviceId(undefined);
    }
    //eslint-disable-next-line
  }, [selectedVideoDevice]);

  // this is required during changing webcam device
  useEffect(() => {
    if (!selectedVideoDevice || !deviceId) {
      return;
    }
    if (selectedVideoDevice === deviceId) {
      return;
    }

    const changeDevice = async (deviceId: string) => {
      await currentRoom.switchActiveDevice('videoinput', deviceId);
    };
    // for virtual background we'll require creating new stream
    const changeDeviceWithVB = async (deviceId: string) => {
      await createDeviceStream(deviceId);
    };

    if (virtualBackground.type === 'none') {
      changeDevice(selectedVideoDevice).then();
    } else {
      changeDeviceWithVB(selectedVideoDevice).then();
    }

    setDeviceId(selectedVideoDevice);
    // eslint-disable-next-line
  }, [selectedVideoDevice]);

  // virtualBgLocalTrack only update when using virtual background
  // need to stop previous track before starting new one
  useEffect(() => {
    if (virtualBgLocalTrack && virtualBgVideoPlayer) {
      const el = virtualBgVideoPlayer.current;
      if (el) {
        el.srcObject = virtualBgLocalTrack;
      }
    }
    return () => {
      if (virtualBgLocalTrack) {
        virtualBgLocalTrack.getTracks().forEach((t) => t.stop());
      }
    };
  }, [virtualBgLocalTrack]);

  // only for initial
  useEffect(() => {
    if (selectedVideoDevice !== '') {
      setDeviceId(selectedVideoDevice);
      createDeviceStream(selectedVideoDevice).then();
    }
    //eslint-disable-next-line
  }, []);

  // for virtual background
  const handleVirtualBgVideoOnLoad = () => {
    const el = virtualBgVideoPlayer.current;
    if (el) {
      setSourcePlayback({
        htmlElement: el,
        width: el.videoWidth ?? 320,
        height: el.videoHeight ?? 180,
      });
    }
  };

  const toggleWebcam = async () => {
    if (lockWebcam) {
      return;
    }

    if (!isActiveWebcam) {
      if (selectedVideoDevice !== '') {
        setDeviceId(selectedVideoDevice);
        createDeviceStream(selectedVideoDevice).then();
      } else {
        dispatch(updateShowVideoShareModal(!isActiveWebcam));
      }
    } else if (isActiveWebcam) {
      // we'll replace it by empty Stream
      const emptyStream = createEmptyVideoStreamTrack(
        currentRoom.localParticipant.name ?? 'User',
      );
      await checkPreviousCameraTrackAndReplace(emptyStream);

      dispatch(updateIsActiveWebcam(false));
      if (virtualBackground.type !== 'none') {
        if (virtualBgLocalTrack) {
          virtualBgLocalTrack.getTracks().forEach((t) => t.stop());
          setVirtualBgLocalTrack(undefined);
          setSourcePlayback(undefined);
        }
      }
      setDeviceId(undefined);
    }
  };

  const createDeviceStream = async (deviceId: string) => {
    if (virtualBackground.type === 'none') {
      const resolution = getWebcamResolution();
      const track = await createLocalVideoTrack({
        deviceId: {
          exact: deviceId,
          ideal: deviceId,
        },
        resolution,
      });

      // check if already have a stream or not
      const replaced = await checkPreviousCameraTrackAndReplace(
        track.mediaStreamTrack,
      );
      if (!replaced) {
        await currentRoom.localParticipant.publishTrack(track);
      }

      dispatch(updateIsActiveWebcam(true));
    } else {
      const constraints: MediaStreamConstraints = {
        video: {
          // width: { min: 160, ideal: 320 },
          // height: { min: 90, ideal: 180 },
          deviceId: {
            exact: deviceId,
            ideal: deviceId,
          },
        },
      };
      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setVirtualBgLocalTrack(mediaStream);
    }
  };

  const checkPreviousCameraTrackAndReplace = async (
    newTrack: MediaStreamTrack,
  ): Promise<boolean> => {
    let replaced = false;
    for (const publication of currentRoom.localParticipant.videoTrackPublications.values()) {
      if (
        publication.track &&
        publication.track.source === Track.Source.Camera
      ) {
        // disable current track
        publication.track.mediaStreamTrack.enabled = false;
        // enable new track
        newTrack.enabled = true;
        await publication.track.replaceTrack(newTrack, {
          userProvidedTrack: true,
        });
        replaced = true;
      }
    }

    return replaced;
  };

  const onSelectedDevice = async (deviceId: string) => {
    setDeviceId(deviceId);
    await createDeviceStream(deviceId);
    dispatch(updateSelectedVideoDevice(deviceId));
  };

  // handle virtual background canvas
  const onCanvasRef = (
    canvasRef: React.MutableRefObject<HTMLCanvasElement>,
  ) => {
    const stream = canvasRef.current.captureStream(25);
    stream.getTracks().forEach(async (track) => {
      if (track.kind === Track.Kind.Video) {
        // check if already have a stream or not
        const replace = await checkPreviousCameraTrackAndReplace(track);
        if (!replace) {
          await currentRoom.localParticipant.publishTrack(track, {
            source: Track.Source.Camera,
            name: 'canvas',
          });
        }
        dispatch(updateIsActiveWebcam(true));
      }
    });
  };

  const shouldShow = () => {
    const session = store.getState().session;
    const room_features = session.currentRoom.metadata?.roomFeatures;
    const currentUser = session.currentUser;

    if (!room_features?.allowWebcams) {
      return false;
    } else if (
      room_features?.adminOnlyWebcams &&
      !currentUser?.metadata?.isAdmin
    ) {
      return false;
    }

    return true;
  };

  const getTooltipText = () => {
    if (!isActiveWebcam && !isWebcamLock) {
      return t('footer.icons.start-webcam');
    } else if (!isActiveWebcam && isWebcamLock) {
      return t('footer.icons.webcam-locked');
    } else if (isActiveWebcam) {
      return t('footer.icons.leave-webcam');
    }
  };

  const showButtons = () => {
    return (
      <>
        <div
          className={`relative footer-icon cursor-pointer min-w-11 3xl:min-w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[20px] border-[3px] 3xl:border-4 ${!isActiveWebcam && selectedVideoDevice !== '' ? 'border-Red-100!' : ''} ${isActiveWebcam ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'} ${lockWebcam ? 'border-Red-100! pointer-events-none' : ''}`}
        >
          <div
            className={`cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-[12px] 3xl:rounded-2xl h-full w-full flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950  ${!isActiveWebcam && selectedVideoDevice !== '' ? 'border-Red-200!' : ''}  ${lockWebcam ? 'border-Red-200! text-Red-400' : ''}`}
          >
            <div
              className={`w-[36px] 3xl:w-[42px] h-full relative flex items-center justify-center ${showTooltip ? 'has-tooltip' : ''}`}
              onClick={() => toggleWebcam()}
            >
              <span className="tooltip">{getTooltipText()}</span>
              {isActiveWebcam ? (
                <Camera classes={'h-4 3xl:h-5 w-auto'} />
              ) : null}
              {!isActiveWebcam ? (
                <>
                  {selectedVideoDevice === '' ? (
                    <>
                      <Camera classes={'h-4 3xl:h-5 w-auto'} />
                      <span className="add absolute -top-2 -right-2 z-10">
                        {lockWebcam ? (
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
              ) : null}
              {/*{lockWebcam ? (
                <>
                  <CameraOff classes={'h-4 3xl:h-5 w-auto'} />
                  <span className="blocked absolute -top-2 -right-2 z-10">
                    <BlockedIcon />
                  </span>
                </>
              ) : null}*/}
            </div>
            {isActiveWebcam ? (
              <WebcamMenu
                currentRoom={currentRoom}
                isActiveWebcam={isActiveWebcam}
              />
            ) : null}
          </div>
        </div>
      </>
    );
  };

  const render = () => {
    return (
      <>
        {showButtons()}

        {showVideoShareModal ? (
          <ShareWebcamModal
            onSelectedDevice={onSelectedDevice}
            selectedDeviceId={selectedVideoDevice}
            displayWebcamSelection={true}
          />
        ) : null}

        {/*For virtual background*/}
        {sourcePlayback && deviceId && virtualBackground.type !== 'none' ? (
          <div style={{ display: 'none' }}>
            <VirtualBackground
              sourcePlayback={sourcePlayback}
              id={deviceId}
              backgroundConfig={virtualBackground}
              onCanvasRef={onCanvasRef}
            />
          </div>
        ) : null}
        {virtualBgLocalTrack ? (
          <div style={{ display: 'none' }}>
            <video
              ref={virtualBgVideoPlayer}
              autoPlay
              onLoadedData={handleVirtualBgVideoOnLoad}
            />
          </div>
        ) : null}
      </>
    );
  };

  return <>{shouldShow() ? render() : null}</>;
};

export default WebcamIcon;
