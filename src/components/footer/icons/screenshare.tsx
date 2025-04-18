import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  createLocalScreenTracks,
  ScreenShareCaptureOptions,
  Track,
} from 'livekit-client';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveScreenshare } from '../../../store/slices/bottomIconsActivitySlice';
import { updateScreenSharing } from '../../../store/slices/sessionSlice';
import { IRoomMetadata } from '../../../store/slices/interfaces/session';
import { getScreenShareResolution } from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';

const ScrenshareIcon = () => {
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  const { t } = useTranslation();

  const isActiveScreenshare = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveScreenshare,
  );
  const sessionScreenSharing = useAppSelector(
    (state) => state.session.screenSharing,
  );
  const isScreenshareLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockScreenSharing,
  );

  const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const [lock, setLock] = useState<boolean>(false);
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

  useEffect(() => {
    if (
      sessionScreenSharing.isActive &&
      sessionScreenSharing.sharedBy === currentRoom.localParticipant.identity
    ) {
      setIconCSS('secondaryColor');
    } else {
      setIconCSS('primaryColor dark:text-darkText');
    }
    //eslint-disable-next-line
  }, [sessionScreenSharing]);

  const endScreenShare = useCallback(async () => {
    if (isActiveScreenshare) {
      for (const [
        ,
        publication,
      ] of currentRoom.localParticipant.trackPublications.entries()) {
        if (
          (publication.source === Track.Source.ScreenShare ||
            publication.source === Track.Source.ScreenShareAudio) &&
          publication.track
        ) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }
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
    if (isAdmin) {
      return;
    }
    if (isScreenshareLock) {
      setLock(true);
      endScreenShare().then();
    } else if (!isScreenshareLock) {
      setLock(false);
    }
    //eslint-disable-next-line
  }, [endScreenShare, isScreenshareLock]);

  // for special case when user cancels sharing from browser directly,
  // we will check & disable button status.
  useEffect(() => {
    if (!sessionScreenSharing.isActive && isActiveScreenshare) {
      dispatch(updateIsActiveScreenshare(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionScreenSharing]);

  const toggleScreenShare = async () => {
    if (lock) {
      return;
    }

    if (!isActiveScreenshare) {
      if (sessionScreenSharing.isActive) {
        toast(t('footer.notice.already-active-screen-sharing'), {
          toastId: 'dup-screen-share',
          type: 'warning',
        });
        return;
      }

      const option: ScreenShareCaptureOptions = {
        audio: true,
      };
      // because of one bug, we'll disable to set regulation for safari
      // https://bugs.webkit.org/show_bug.cgi?id=263015
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      );
      if (!isSafari) {
        option.resolution = getScreenShareResolution();
      }

      const localTracks = await createLocalScreenTracks(option);
      for (let i = 0; i < localTracks.length; i++) {
        const track = localTracks[i];
        await currentRoom.localParticipant.publishTrack(track);
      }

      dispatch(updateIsActiveScreenshare(true));
      dispatch(
        updateScreenSharing({
          isActive: true,
          sharedBy: currentRoom.localParticipant.identity,
        }),
      );
    } else {
      endScreenShare().then();
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

  const shouldShow = () => {
    const session = store.getState().session;
    const metadata = session.currentRoom.metadata as IRoomMetadata;
    return metadata.roomFeatures?.allowScreenShare;
  };

  const render = () => {
    return (
      <div
        className={`share-screen footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] relative rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] ltr:mr-3 lg:ltr:mr-6 rtl:ml-3 lg:rtl:ml-6 hidden md:flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleScreenShare()}
      >
        <span className="tooltip">{text()}</span>
        <>
          <i
            className={`pnm-screen-share ${iconCSS} text-[14px] lg:text-[16px]`}
          />
          {lock ? (
            <div className="arrow-down absolute -bottom-1 -right-1 w-[16px] h-[16px] rounded-full bg-white flex items-center justify-center">
              <i className="pnm-lock primaryColor" />
            </div>
          ) : null}
        </>
      </div>
    );
  };

  return <>{shouldShow() ? render() : null}</>;
};

export default ScrenshareIcon;
