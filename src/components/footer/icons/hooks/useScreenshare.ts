import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createLocalScreenTracks,
  ScreenShareCaptureOptions,
  Track,
} from 'livekit-client';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../../store';
import { updateIsActiveScreenshare } from '../../../../store/slices/bottomIconsActivitySlice';
import { updateScreenSharing } from '../../../../store/slices/sessionSlice';
import { getScreenShareResolution } from '../../../../helpers/utils';
import { getMediaServerConnRoom } from '../../../../helpers/livekit/utils';
import { addUserNotification } from '../../../../store/slices/roomSettingsSlice';
import {
  isHybridMode,
  publishNativeMedia,
  unpublishNativeMedia,
  useNativePublisherStatus,
} from '../../../../helpers/nativeBridge';

export interface UseScreenshareReturn {
  isScreenShareAllowed: boolean;
  isMobileOrTablet: boolean;
  showTooltip: boolean;
  hybrid: boolean;
  nativeAvailable: boolean;
  isActiveShare: boolean;
  isLocked: boolean;
  toggleScreenShare: () => Promise<void>;
  endScreenShare: () => Promise<void>;
}

let isPublishing = false;

const useScreenshare = (): UseScreenshareReturn => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  const { t } = useTranslation();

  const { isAdmin, isScreenShareAllowed, isMobileOrTablet, showTooltip } =
    useMemo(() => {
      const session = store.getState().session;
      const deviceType = session.userDeviceType;
      return {
        isAdmin: !!session.currentUser?.metadata?.isAdmin,
        isScreenShareAllowed:
          !!session.currentRoom.metadata?.roomFeatures?.allowScreenShare,
        isMobileOrTablet: deviceType === 'mobile' || deviceType === 'tablet',
        showTooltip: deviceType === 'desktop',
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

  const hybrid = isHybridMode();
  const { available: nativeAvailable } = useNativePublisherStatus();

  const isLocked = useMemo(
    () => !!(isScreenshareLock && !isAdmin),
    [isAdmin, isScreenshareLock],
  );

  const endScreenShare = useCallback(async () => {
    if (hybrid) {
      if (isActiveScreenshare) {
        unpublishNativeMedia(NativeMediaSource.SCREENSHARE);
      }
      return;
    }
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
  }, [hybrid, isActiveScreenshare, dispatch, currentRoom]);

  // for change in lock setting
  // NOTE: native lock handled in useHybridLockForwarder (nativeBridge/hooks.ts)
  useEffect(() => {
    if (isLocked) {
      void endScreenShare();
    }
    //eslint-disable-next-line
  }, [isLocked]);

  // for special case when user cancels sharing from browser directly
  useEffect(() => {
    if (hybrid) return;
    if (!sessionScreenSharing.isActive && isActiveScreenshare) {
      dispatch(updateIsActiveScreenshare(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionScreenSharing]);

  const toggleScreenShare = useCallback(async () => {
    if (isLocked || isPublishing) {
      return;
    }

    if (hybrid) {
      if (!nativeAvailable) return;
      if (!isActiveScreenshare) {
        publishNativeMedia(NativeMediaSource.SCREENSHARE);
      } else {
        unpublishNativeMedia(NativeMediaSource.SCREENSHARE);
      }
      return;
    }

    isPublishing = true;

    try {
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
        await endScreenShare();
      }
    } catch (e: any) {
      console.error('screenshare error', e);
      const name = e?.name ?? '';
      if (name !== 'NotAllowedError' && name !== 'PermissionDeniedError') {
        dispatch(
          addUserNotification({
            message: t('footer.notice.screenshare-error'),
            typeOption: 'error',
          }),
        );
      }
    } finally {
      isPublishing = false;
    }
  }, [
    isLocked,
    hybrid,
    nativeAvailable,
    isActiveScreenshare,
    sessionScreenSharing,
    currentRoom,
    dispatch,
    t,
    endScreenShare,
  ]);

  return {
    isScreenShareAllowed,
    isMobileOrTablet,
    showTooltip,
    hybrid,
    nativeAvailable,
    isActiveShare: isActiveScreenshare,
    isLocked,
    toggleScreenShare,
    endScreenShare,
  };
};

export default useScreenshare;
