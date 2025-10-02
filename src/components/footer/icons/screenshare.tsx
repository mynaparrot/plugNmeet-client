import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createLocalScreenTracks,
  ScreenShareCaptureOptions,
  Track,
} from 'livekit-client';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveScreenshare } from '../../../store/slices/bottomIconsActivitySlice';
import { updateScreenSharing } from '../../../store/slices/sessionSlice';
import { getScreenShareResolution } from '../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../helpers/livekit/utils';
import { ShareScreenIconSVG } from '../../../assets/Icons/ShareScreenIconSVG';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

const ScrenshareIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  const { t } = useTranslation();

  const { isAdmin, isScreenShareAllowed, showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      isAdmin: !!session.currentUser?.metadata?.isAdmin,
      isScreenShareAllowed:
        !!session.currentRoom.metadata?.roomFeatures?.allowScreenShare,
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

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

  const isLocked = useMemo(
    () => !isAdmin && isScreenshareLock,
    [isAdmin, isScreenshareLock],
  );

  const endScreenShare = useCallback(async () => {
    if (isActiveScreenshare && currentRoom) {
      for (const publication of currentRoom.localParticipant.trackPublications.values()) {
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
    if (isLocked) {
      endScreenShare().then();
    }
    //eslint-disable-next-line
  }, [isLocked]);

  // for special case when user cancels sharing from browser directly,
  // we will check & disable button status.
  useEffect(() => {
    if (!sessionScreenSharing.isActive && isActiveScreenshare) {
      dispatch(updateIsActiveScreenshare(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionScreenSharing]);

  const toggleScreenShare = async () => {
    if (isLocked) {
      return;
    }

    if (!isActiveScreenshare) {
      if (sessionScreenSharing.isActive) {
        dispatch(
          addUserNotification({
            message: t('footer.notice.already-active-screen-sharing'),
            typeOption: 'error',
          }),
        );
        return;
      }

      if (!currentRoom) {
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
    } else if (!isActiveScreenshare && !isLocked) {
      return t('footer.icons.start-screen-sharing');
    } else if (isLocked) {
      return t('footer.icons.screen-sharing-locked');
    }
  };

  const wrapperClasses = clsx(
    'share-screen relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)]': isActiveScreenshare,
      'border-transparent': !isActiveScreenshare,
      'border-Red-100! pointer-events-none': isLocked,
    },
  );

  const innerDivClasses = clsx(
    'h-full relative w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100': isActiveScreenshare,
      'bg-white': !isActiveScreenshare,
      'border-Red-200! text-Red-400': isLocked,
    },
  );

  if (!isScreenShareAllowed) {
    return null;
  }

  return (
    <div className={wrapperClasses} onClick={() => toggleScreenShare()}>
      <div className={innerDivClasses}>
        <span className="tooltip">{text()}</span>
        <ShareScreenIconSVG classes="w-auto h-4 3xl:h-5" />
        {isLocked && (
          <span className="add absolute -top-2 -right-2 z-10">
            <i className="pnm-lock primaryColor" />
          </span>
        )}
      </div>
    </div>
  );
};

export default ScrenshareIcon;
