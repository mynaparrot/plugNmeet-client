import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { createSelector } from '@reduxjs/toolkit';
import ShareWebcamModal from '../modals/shareWebcam';
import { createLocalTracks, Room, Track, VideoPresets } from 'livekit-client';
import WebcamMenu from './webcam-menu';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { updateSelectedVideoDevice } from '../../../store/slices/roomSettingsSlice';
import VirtualBackground from '../../virtual-background/virtualBackground';
import { SourcePlayback } from '../../virtual-background/helpers/sourceHelper';
import Kind = Track.Kind;
import Source = Track.Source;

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

const WebcamIcon = ({ currentRoom }: IWebcamIconProps) => {
  const dispatch = useAppDispatch();
  // we don't need this for small devices
  const showTooltip = store.getState().session.userDeviceType === 'desktop';

  const showVideoShareModal = useAppSelector(showVideoShareModalSelector);
  const isActiveWebcam = useAppSelector(isActiveWebcamPanelSelector);
  const isWebcamLock = useAppSelector(isWebcamLockSelector);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();

  const [allowWebcam, setAllowWebcam] = useState<boolean>(true);
  const [lockWebcam, setLockWebcam] = useState<boolean>(false);
  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();
  const [deviceId, setDeviceId] = useState();

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

  useEffect(() => {
    if (!isActiveWebcam) {
      setDeviceId(undefined);
    }
  }, [isActiveWebcam]);

  const toggleWebcam = () => {
    if (lockWebcam) {
      return;
    }

    if (!isActiveWebcam) {
      dispatch(updateShowVideoShareModal(!isActiveWebcam));
    }
  };

  const onSelectedDevice = async (deviceId) => {
    setDeviceId(deviceId);

    const localTrack = await createLocalTracks({
      audio: false,
      video: {
        deviceId: deviceId,
        resolution: VideoPresets.hd,
      },
    });

    localTrack.forEach((track) => {
      if (track.kind === Track.Kind.Video) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(track.mediaStreamTrack);
        const el = videoRef.current;
        if (el) {
          console.log(mediaStream);
          el.srcObject = mediaStream;
        }

        // await currentRoom.localParticipant.publishTrack(track);
        // dispatch(updateIsActiveWebcam(true));
      }
    });

    dispatch(updateSelectedVideoDevice(deviceId));
  };

  const onLoadedData = () => {
    const el: any = videoRef.current;
    if (el) {
      setSourcePlayback({
        htmlElement: el,
        height: VideoPresets.hd.height,
        width: VideoPresets.hd.width,
      });
    }
  };

  const onCanvasRef = (
    canvasRef: React.MutableRefObject<HTMLCanvasElement>,
  ) => {
    console.log('canvasRef.current.id', canvasRef.current.id);

    const stream = canvasRef.current.captureStream();

    stream.getTracks().forEach(async (track) => {
      if (track.kind === Kind.Video) {
        await currentRoom.localParticipant.publishTrack(track, {
          source: Source.Camera,
        });
        dispatch(updateIsActiveWebcam(true));
      }
    });
  };

  const render = () => {
    return (
      <>
        <div
          className={`camera relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
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
          {sourcePlayback && deviceId ? (
            <div style={{ display: 'none' }}>
              <VirtualBackground
                sourcePlayback={sourcePlayback}
                id={deviceId}
                onCanvasRef={onCanvasRef}
              />
            </div>
          ) : null}
        </>
        <>
          {deviceId ? (
            <video
              style={{ display: 'none' }}
              className="mt-5 mb-5"
              ref={videoRef}
              autoPlay
              height="50"
              onLoadedData={onLoadedData}
            />
          ) : null}
        </>
      </>
    );
  };

  return <>{allowWebcam ? render() : null}</>;
};

export default WebcamIcon;
