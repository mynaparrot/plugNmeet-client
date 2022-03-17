import React, { useEffect, useState, useCallback } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { createLocalScreenTracks, Room, Track } from 'livekit-client';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { updateIsActiveScreenshare } from '../../../store/slices/bottomIconsActivitySlice';
import { updateScreenSharing } from '../../../store/slices/sessionSlice';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';

interface IScrenshareIconProps {
  currentRoom: Room;
}

const isActiveScreenshareSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveScreenshare,
  (isActiveScreenshare) => isActiveScreenshare,
);

const sessionIsActiveScreenSharingSelector = createSelector(
  (state: RootState) => state.session.screenSharing,
  (screenSharing) => screenSharing.isActive,
);

const isScreenshareLockSelector = createSelector(
  (state: RootState) =>
    state.session.currenUser?.metadata?.lock_settings.lock_screen_sharing,
  (lock_screen_sharing) => lock_screen_sharing,
);

const ScrenshareIcon = ({ currentRoom }: IScrenshareIconProps) => {
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isActiveScreenshare = useAppSelector(isActiveScreenshareSelector);
  const sessionIsActiveScreensharing = useAppSelector(
    sessionIsActiveScreenSharingSelector,
  );
  const isScreenshareLock = useAppSelector(isScreenshareLockSelector);

  const [iconCSS, setIconCSS] = useState<string>('brand-color1');
  const [allowScreenSharing, setAllowScreenSharing] = useState<boolean>(true);
  const [lock, setLock] = useState<boolean>(false);

  useEffect(() => {
    if (isActiveScreenshare) {
      setIconCSS('brand-color2');
    } else {
      setIconCSS('brand-color1');
    }
  }, [isActiveScreenshare]);

  useEffect(() => {
    const metadata = store.getState().session.currentRoom
      .metadata as IRoomMetadata;
    if (!metadata.room_features?.allow_webcams) {
      setAllowScreenSharing(false);
    }
  }, []);

  const endScreenShare = useCallback(() => {
    if (isActiveScreenshare) {
      currentRoom.localParticipant.tracks.forEach((publication) => {
        if (
          (publication.source === Track.Source.ScreenShare ||
            publication.source === Track.Source.ScreenShareAudio) &&
          publication.track
        ) {
          currentRoom.localParticipant.unpublishTrack(publication.track);
        }
      });
      dispatch(updateIsActiveScreenshare(false));
      dispatch(
        updateScreenSharing({
          isActive: false,
          sharedBy: '',
        }),
      );
    }
  }, [isActiveScreenshare, dispatch, currentRoom]);

  // for change in lock setting
  useEffect(() => {
    if (isScreenshareLock) {
      setLock(true);
      endScreenShare();
    } else {
      setLock(false);
    }
  }, [dispatch, endScreenShare, isScreenshareLock]);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.default_lock_settings
        ?.lock_screen_sharing;
    const isAdmin = store.getState().session.currenUser?.metadata?.is_admin;

    if (isLock && !isAdmin) {
      if (isScreenshareLock !== false) {
        setLock(true);
      }
    }
    // eslint-disable-next-line
  }, []);

  // for special case when user will cancel sharing from browser directly
  // we will check & disable button status.
  useEffect(() => {
    if (!sessionIsActiveScreensharing && isActiveScreenshare) {
      dispatch(updateIsActiveScreenshare(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIsActiveScreensharing]);

  const toggleScreenShare = async () => {
    if (lock) {
      return;
    }

    if (!isActiveScreenshare) {
      if (sessionIsActiveScreensharing) {
        toast(t('footer.notice.already-active-screen-sharing'), {
          toastId: 'dup-screen-share',
          type: 'warning',
        });
        return;
      }

      const localTracks = await createLocalScreenTracks({
        audio: true,
      });
      localTracks.forEach(async (track) => {
        await currentRoom.localParticipant.publishTrack(track);
      });

      dispatch(updateIsActiveScreenshare(true));
      dispatch(
        updateScreenSharing({
          isActive: true,
          sharedBy: currentRoom.localParticipant.identity,
        }),
      );
    } else {
      endScreenShare();
    }
  };

  const text = () => {
    if (isActiveScreenshare) {
      return t('footer.icons.stop-screen-sharing');
    } else if (!isActiveScreenshare && !lock) {
      return t('footer.icons.start-screen-sharing');
    } else if (lock) {
      return t('footer.icons.screen-sharing-locked');
    }
  };

  const render = () => {
    return (
      <div
        className={`share-screen h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] relative rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] mr-3 lg:mr-6 hidden md:flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleScreenShare()}
      >
        <span className="tooltip rounded shadow-lg p-1 bg-gray-100 text-red-500 -mt-16 text-[10px] w-max">
          {text()}
        </span>
        <React.Fragment>
          <i
            className={`pnm-screen-share ${iconCSS} text-[12px] lg:text-[16px]`}
          />
          {lock ? (
            <div className="arrow-down absolute -bottom-1 -right-1 w-[16px] h-[16px] rounded-full bg-white flex items-center justify-center">
              <i className="pnm-lock brand-color1" />
            </div>
          ) : null}
        </React.Fragment>
      </div>
    );
  };

  return <>{allowScreenSharing ? render() : null}</>;
};

export default ScrenshareIcon;
