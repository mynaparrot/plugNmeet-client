import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
import {
  createLocalTracks,
  LocalTrack,
  Room,
  Track,
  VideoPreset,
  VideoPresets,
} from 'livekit-client';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import ShareWebcamModal from '../modals/webcam/shareWebcam';
import WebcamMenu from './webcam-menu';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { updateSelectedVideoDevice } from '../../../store/slices/roomSettingsSlice';
import VirtualBackground from '../../virtual-background/virtualBackground';
import { SourcePlayback } from '../../virtual-background/helpers/sourceHelper';

interface IWebcamIconProps {
  currentRoom: Room;
}

const isActiveWebcamPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveWebcam,
  (isActiveWebcam) => isActiveWebcam,
);
const showVideoShareModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showVideoShareModal,
  (showVideoShareModal) => showVideoShareModal,
);
const isWebcamLockSelector = createSelector(
  (state: RootState) =>
    state.session.currenUser?.metadata?.lock_settings.lock_webcam,
  (lock_webcam) => lock_webcam,
);
const virtualBackgroundSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.virtualBackground,
  (virtualBackground) => virtualBackground,
);
const selectedVideoDeviceSelector = createSelector(
  (state: RootState) => state.roomSettings.selectedVideoDevice,
  (selectedVideoDevice) => selectedVideoDevice,
);

const WebcamIcon = ({ currentRoom }: IWebcamIconProps) => {
  const dispatch = useAppDispatch();
  // we don't need this for small devices
  const showTooltip = store.getState().session.userDeviceType === 'desktop';

  const showVideoShareModal = useAppSelector(showVideoShareModalSelector);
  const isActiveWebcam = useAppSelector(isActiveWebcamPanelSelector);
  const isWebcamLock = useAppSelector(isWebcamLockSelector);
  const virtualBackground = useAppSelector(virtualBackgroundSelector);
  const selectedVideoDevice = useAppSelector(selectedVideoDeviceSelector);
  const { t } = useTranslation();

  const [allowWebcam, setAllowWebcam] = useState<boolean>(true);
  const [lockWebcam, setLockWebcam] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>();
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [localTrack, setLocalTrack] = useState<LocalTrack>();

  useEffect(() => {
    const session = store.getState().session;
    const metadata = session.currentRoom.metadata as IRoomMetadata;
    const currentUser = session.currenUser;

    if (!metadata.room_features?.allow_webcams) {
      setAllowWebcam(false);
    } else if (
      metadata.room_features?.admin_only_webcams &&
      !currentUser?.metadata?.is_admin
    ) {
      setAllowWebcam(false);
    }
  }, []);

  // for change in webcam lock setting
  useEffect(() => {
    const closeMicOnLock = () => {
      currentRoom?.localParticipant.videoTracks.forEach((publication) => {
        if (publication.track && publication.source === Track.Source.Camera) {
          currentRoom.localParticipant.unpublishTrack(publication.track);
        }
      });
      dispatch(updateIsActiveWebcam(false));
    };

    if (isWebcamLock) {
      setLockWebcam(true);
      const currentUser = participantsSelector.selectById(
        store.getState(),
        currentRoom.localParticipant.identity,
      );
      if (currentUser?.videoTracks) {
        closeMicOnLock();
      }
    } else {
      setLockWebcam(false);
    }
  }, [isWebcamLock, currentRoom, dispatch]);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.default_lock_settings
        ?.lock_webcam;
    const isAdmin = store.getState().session.currenUser?.metadata?.is_admin;

    if (isLock && !isAdmin) {
      if (isWebcamLock !== false) {
        setLockWebcam(true);
      }
    }
    // eslint-disable-next-line
  }, []);

  // we should check & close track
  useEffect(() => {
    if (!isActiveWebcam && localTrack && !selectedVideoDevice) {
      localTrack.stop();
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
      changeDevice(selectedVideoDevice);
    } else {
      changeDeviceWithVB(selectedVideoDevice);
    }

    setDeviceId(selectedVideoDevice);
    // eslint-disable-next-line
  }, [selectedVideoDevice]);

  // localTrack only update when using virtual background
  // need to stop previous track before starting new one
  useEffect(() => {
    if (localTrack) {
      setSourcePlayback({
        htmlElement: localTrack.attach() as HTMLVideoElement,
        width: 320,
        height: 180,
      });
    }
    return () => {
      if (localTrack) {
        localTrack.stop();
      }
    };
  }, [localTrack]);

  const toggleWebcam = () => {
    if (lockWebcam) {
      return;
    }

    if (!isActiveWebcam) {
      dispatch(updateShowVideoShareModal(!isActiveWebcam));
    }
  };

  const createDeviceStream = async (deviceId) => {
    let resolution = VideoPresets.h720.resolution;

    // with virtual background don't need high resolution
    if (virtualBackground.type !== 'none') {
      const preset = new VideoPreset(160, 96, 60_000, 15);
      resolution = preset.resolution;
    }

    const localTrack = await createLocalTracks({
      audio: false,
      video: {
        deviceId: deviceId,
        resolution,
      },
    });

    localTrack.forEach(async (track) => {
      if (track.kind === Track.Kind.Video) {
        if (virtualBackground.type === 'none') {
          await currentRoom.localParticipant.publishTrack(track);
          dispatch(updateIsActiveWebcam(true));
        } else {
          setLocalTrack(track);
        }
      }
    });

    return;
  };

  const onSelectedDevice = async (deviceId) => {
    setDeviceId(deviceId);
    await createDeviceStream(deviceId);
    dispatch(updateSelectedVideoDevice(deviceId));
  };

  // handle virtual background canvas
  const onCanvasRef = (
    canvasRef: React.MutableRefObject<HTMLCanvasElement>,
  ) => {
    const stream = canvasRef.current.captureStream(15);
    stream.getTracks().forEach(async (track) => {
      if (track.kind === Track.Kind.Video) {
        await currentRoom.localParticipant.publishTrack(track, {
          source: Track.Source.Camera,
          name: 'canvas',
        });
        dispatch(updateIsActiveWebcam(true));
      }
    });
  };

  const render = () => {
    return (
      <>
        <div
          className={`camera footer-icon relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
            showTooltip ? 'has-tooltip' : ''
          }`}
          onClick={() => toggleWebcam()}
        >
          {!isActiveWebcam ? (
            <span className="tooltip rounded shadow-lg p-1 bg-gray-100 text-red-500 -mt-16 text-[10px] w-max">
              {!isWebcamLock
                ? t('footer.icons.start-webcam')
                : t('footer.icons.webcam-locked')}
            </span>
          ) : null}

          <>
            {!isActiveWebcam ? (
              <i className="pnm-webcam brand-color1 text-[10px] lg:text-[14px]" />
            ) : null}
            {lockWebcam ? (
              <div className="arrow-down absolute -bottom-1 -right-1 w-[16px] h-[16px] rounded-full bg-white flex items-center justify-center">
                <i className="pnm-lock brand-color1" />
              </div>
            ) : null}
          </>

          {isActiveWebcam ? <WebcamMenu currentRoom={currentRoom} /> : null}
        </div>
        {showVideoShareModal ? (
          <ShareWebcamModal onSelectedDevice={onSelectedDevice} />
        ) : null}
        <>
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
        </>
      </>
    );
  };

  return <>{allowWebcam ? render() : null}</>;
};

export default WebcamIcon;
