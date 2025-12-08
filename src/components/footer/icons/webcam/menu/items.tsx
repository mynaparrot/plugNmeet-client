import React, { useCallback } from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../../../store';
import { updateSelectedVideoDevice } from '../../../../../store/slices/roomSettingsSlice';
import {
  updateIsActiveWebcam,
  updateVirtualBackground,
} from '../../../../../store/slices/bottomIconsActivitySlice';
import { CheckMarkIcon } from '../../../../../assets/Icons/CheckMarkIcon';
import { CameraOff } from '../../../../../assets/Icons/CameraOff';

interface IWebcamMenuItemsProps {
  currentRoom: Room;
  toggleWebcam: () => void;
}

const WebcamMenuItems = ({
  toggleWebcam,
  currentRoom,
}: IWebcamMenuItemsProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const videoDevices = useAppSelector(
    (state) => state.roomSettings.videoDevices,
  );
  const selectedVideoDevice = useAppSelector(
    (state) => state.roomSettings.selectedVideoDevice,
  );

  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      dispatch(updateSelectedVideoDevice(deviceId));
    },
    [dispatch],
  );

  const leaveWebcam = useCallback(async () => {
    if (currentRoom) {
      for (const publication of currentRoom.localParticipant.videoTrackPublications.values()) {
        if (
          publication.track &&
          publication.track.source === Track.Source.Camera
        ) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }
    }
    dispatch(updateIsActiveWebcam(false));
    dispatch(updateSelectedVideoDevice(''));
    dispatch(
      updateVirtualBackground({
        type: 'none',
      }),
    );
  }, [currentRoom, dispatch]);

  return (
    <MenuItems
      static
      className="menu origin-top-right z-10 absolute ltr:-left-8 md:ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl overflow-hidden p-2 w-max"
    >
      <div className="title h-8 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-3 uppercase">
        {t('footer.icons.select-webcam')}
      </div>
      {videoDevices.map((device) => (
        <MenuItem key={device.id}>
          {() => (
            <p
              className={`${
                selectedVideoDevice === device.id
                  ? 'bg-Gray-50 dark:bg-dark-secondary2'
                  : ''
              } h-8 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2`}
              onClick={() => handleDeviceChange(device.id)}
            >
              {device.label}
              {selectedVideoDevice === device.id ? <CheckMarkIcon /> : ''}
            </p>
          )}
        </MenuItem>
      ))}
      <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ml-3 my-1"></div>
      <div className="" role="none">
        <MenuItem>
          {() => (
            <p
              className="h-8 w-full flex items-center text-sm gap-2 leading-none font-medium text-red-700 px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2"
              onClick={toggleWebcam}
            >
              <CameraOff classes={'h-4 w-auto'} />
              {t('footer.icons.turn-off-webcam')}
            </p>
          )}
        </MenuItem>
      </div>
      <div className="" role="none">
        <MenuItem>
          {() => (
            <p
              className="group h-8 w-full flex items-center text-sm gap-2 leading-none font-medium text-red-700 px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2"
              onClick={leaveWebcam}
            >
              <i className="pnm-logout text-red-700 text-base transition ease-in" />
              {t('footer.menus.leave-webcam')}
            </p>
          )}
        </MenuItem>
      </div>
    </MenuItems>
  );
};

export default WebcamMenuItems;
