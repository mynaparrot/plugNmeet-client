import React, { useCallback } from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateSelectedVideoDevice } from '../../../../store/slices/roomSettingsSlice';
import {
  updateIsActiveWebcam,
  updateIsWebcamMuted,
  updateVirtualBackground,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { CheckMarkIcon } from '../../../../assets/Icons/CheckMarkIcon';
import { CameraOff } from '../../../../assets/Icons/CameraOff';
import { unpublishNativeMedia } from '../../../../helpers/nativeBridge';

interface IWebcamMenuItemsProps {
  currentRoom: Room;
  isHybrid: boolean;
  toggleWebcam: () => void;
  isLocked?: boolean;
}

const WebcamMenuItems = ({
  toggleWebcam,
  currentRoom,
  isHybrid,
  isLocked,
}: IWebcamMenuItemsProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const videoDevices = useAppSelector(
    (state) => state.roomSettings.videoDevices,
  );
  const selectedVideoDevice = useAppSelector(
    (state) => state.roomSettings.selectedVideoDevice,
  );
  const isWebcamMuted = useAppSelector(
    (state) => state.bottomIconsActivity.isWebcamMuted,
  );

  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      dispatch(updateSelectedVideoDevice(deviceId));
    },
    [dispatch],
  );

  const leaveWebcam = useCallback(async () => {
    if (isLocked) return;
    if (isHybrid) {
      unpublishNativeMedia(NativeMediaSource.WEBCAM);
      return;
    }
    if (currentRoom) {
      const publication = currentRoom.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      if (publication && publication.track) {
        await currentRoom.localParticipant.unpublishTrack(
          publication.track,
          true,
        );
        dispatch(updateIsActiveWebcam(false));
        dispatch(updateIsWebcamMuted(false));
        dispatch(updateSelectedVideoDevice(''));
        dispatch(
          updateVirtualBackground({
            type: 'none',
          }),
        );
      }
    }
  }, [currentRoom, dispatch, isHybrid, isLocked]);

  const renderWebMenuItems = () => {
    return (
      <>
        <div className="title h-8 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-3 uppercase">
          {t('footer.icons.select-webcam')}
        </div>
        {videoDevices.map((device) => (
          <MenuItem key={device.id}>
            {() => (
              <button
                type="button"
                className={`${
                  selectedVideoDevice === device.id
                    ? 'bg-Gray-50 dark:bg-dark-secondary2'
                    : ''
                } h-8 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2 focus-ring`}
                onClick={() => handleDeviceChange(device.id)}
              >
                <span dir="ltr">{device.label}</span>
                {selectedVideoDevice === device.id ? <CheckMarkIcon /> : ''}
              </button>
            )}
          </MenuItem>
        ))}
        <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-1"></div>
      </>
    );
  };

  return (
    <MenuItems
      anchor="top end"
      transition
      className="menu z-10 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl p-2 w-max focus:outline-hidden [--anchor-gap:8px] transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
    >
      {!isHybrid ? renderWebMenuItems() : null}
      <div className="" role="none">
        <MenuItem disabled={isLocked}>
          {() => (
            <button
              type="button"
              className="h-8 w-full flex items-center text-sm gap-2 leading-none font-medium text-red-700 px-2 rounded-lg transition-all duration-300 hover:bg-Red-600 hover:text-white focus-ring"
              onClick={toggleWebcam}
            >
              <CameraOff classes={'h-4 w-auto'} />
              {isWebcamMuted
                ? t('footer.icons.start-webcam')
                : t('footer.icons.turn-off-webcam')}
            </button>
          )}
        </MenuItem>
      </div>
      <div className="" role="none">
        <MenuItem disabled={isLocked}>
          {() => (
            <button
              type="button"
              className="group h-8 w-full flex items-center text-sm gap-2 leading-none font-medium text-red-700 px-2 rounded-lg transition-all duration-300 hover:bg-Red-600 hover:text-white focus-ring"
              onClick={leaveWebcam}
            >
              <i className="pnm-logout text-base transition ease-in" />
              {t('footer.menus.leave-webcam')}
            </button>
          )}
        </MenuItem>
      </div>
    </MenuItems>
  );
};

export default WebcamMenuItems;
