import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useAppSelector,
  RootState,
  useAppDispatch,
  store,
} from '../../../store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import { createSelector } from '@reduxjs/toolkit';
import ShareWebcamModal from '../modals/shareWebcam';
import { Room, Track } from 'livekit-client';
import WebcamMenu from './webcam-menu';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import { participantsSelector } from '../../../store/slices/participantSlice';

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
  const { t } = useTranslation();

  const [allowWebcam, setAllowWebcam] = useState<boolean>(true);
  const [lockWebcam, setLockWebcam] = useState<boolean>(false);

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

  const toggleWebcam = () => {
    if (lockWebcam) {
      return;
    }

    if (!isActiveWebcam) {
      dispatch(updateShowVideoShareModal(!isActiveWebcam));
    }
  };

  const render = () => {
    return (
      <React.Fragment>
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

          <React.Fragment>
            {!isActiveWebcam ? (
              <i className="pnm-webcam brand-color1 text-[10px] lg:text-[14px]" />
            ) : null}
            {lockWebcam ? (
              <div className="arrow-down absolute -bottom-1 -right-1 w-[16px] h-[16px] rounded-full bg-white flex items-center justify-center">
                <i className="pnm-lock brand-color1" />
              </div>
            ) : null}
          </React.Fragment>

          {isActiveWebcam ? <WebcamMenu currentRoom={currentRoom} /> : null}
        </div>
        {showVideoShareModal ? (
          <ShareWebcamModal currentRoom={currentRoom} />
        ) : null}
      </React.Fragment>
    );
  };

  return <React.Fragment>{allowWebcam ? render() : null}</React.Fragment>;
};

export default WebcamIcon;
