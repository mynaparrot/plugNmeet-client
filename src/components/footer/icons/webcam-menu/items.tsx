import React, { useEffect, useState } from 'react';
import { Menu } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';

import { RootState, useAppDispatch, useAppSelector } from '../../../../store';
import { updateSelectedVideoDevice } from '../../../../store/slices/roomSettingsSlice';
import {
  updateIsActiveWebcam,
  updateVirtualBackground,
} from '../../../../store/slices/bottomIconsActivitySlice';

interface IWebcamMenuItemsProps {
  currentRoom: Room;
}
const videoDevicesSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.videoDevices,
);

const selectedVideoDeviceSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.selectedVideoDevice,
);

const WebcamMenuItems = ({ currentRoom }: IWebcamMenuItemsProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const videoDevices = useAppSelector(videoDevicesSelector);
  const selectedVideoDevice = useAppSelector(selectedVideoDeviceSelector);

  const [devicesMenu, setDevicesMenu] = useState<Array<JSX.Element>>();
  const [newDevice, setNewDevice] = useState<string>();

  useEffect(() => {
    const devicesMenu = videoDevices.map((device) => {
      return (
        <div className="" role="none" key={device.id}>
          <Menu.Item>
            {() => (
              <p
                className={`${
                  selectedVideoDevice === device.id
                    ? 'secondaryColor'
                    : 'text-gray-700 dark:text-darkText'
                } rounded group flex items-center px-3 py-[0.4rem] text-[10px] lg:text-xs transition ease-in hover:bg-primaryColor hover:text-white cursor-pointer`}
                onClick={() => setNewDevice(device.id)}
              >
                {device.label}
              </p>
            )}
          </Menu.Item>
        </div>
      );
    });
    setDevicesMenu(devicesMenu);
  }, [selectedVideoDevice, videoDevices]);

  useEffect(() => {
    if (newDevice) {
      dispatch(updateSelectedVideoDevice(newDevice));
    }
  }, [newDevice, dispatch]);

  const leaveWebcam = () => {
    currentRoom.localParticipant.videoTracks.forEach(async (publication) => {
      if (
        publication.track &&
        publication.track.source === Track.Source.Camera
      ) {
        currentRoom.localParticipant.unpublishTrack(publication.track, true);
      }
    });
    dispatch(updateIsActiveWebcam(false));
    dispatch(updateSelectedVideoDevice(''));
    dispatch(
      updateVirtualBackground({
        type: 'none',
      }),
    );
  };

  return (
    <Menu.Items
      static
      className="origin-bottom-right z-[9999] absolute ltr:left-0 rtl:-left-4 mt-2 w-40 bottom-[40px] rounded-md shadow-lg bg-white dark:bg-darkPrimary ring-1 ring-black dark:ring-secondaryColor ring-opacity-5 divide-y divide-gray-100 dark:divide-secondaryColor focus:outline-none"
    >
      {devicesMenu}
      <div className="" role="none">
        <Menu.Item>
          {() => (
            <p
              className="text-red-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs transition ease-in hover:bg-red-400 hover:text-white cursor-pointer"
              onClick={() => leaveWebcam()}
            >
              {t('footer.menus.leave-webcam')}
            </p>
          )}
        </Menu.Item>
      </div>
    </Menu.Items>
  );
};

export default WebcamMenuItems;
