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

interface IWebcamMenuItemsProps {
  currentRoom: Room;
}

const WebcamMenuItems = ({ currentRoom }: IWebcamMenuItemsProps) => {
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
      className="menu origin-top-right z-10 absolute ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2 w-max"
    >
      <div className="title h-8 3xl:h-10 w-full flex items-center text-xs 3xl:text-sm leading-none text-Gray-700 px-3 uppercase">
        Select Webcams
      </div>
      {videoDevices.map((device) => (
        <MenuItem key={device.id}>
          {() => (
            <p
              className={`${
                selectedVideoDevice === device.id ? 'bg-Gray-50' : ''
              } h-8 3xl:h-10 w-full flex items-center text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50`}
              onClick={() => handleDeviceChange(device.id)}
            >
              {device.label}
              {selectedVideoDevice === device.id ? <CheckMarkIcon /> : ''}
            </p>
          )}
        </MenuItem>
      ))}
      <div className="" role="none">
        <MenuItem>
          {() => (
            <p
              className="h-8 3xl:h-10 w-full flex items-center text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50 hover:text-red-700"
              onClick={leaveWebcam}
            >
              {t('footer.menus.leave-webcam')}
            </p>
          )}
        </MenuItem>
      </div>
    </MenuItems>
  );
};

export default WebcamMenuItems;
