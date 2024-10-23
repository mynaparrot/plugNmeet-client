import React, { useEffect, useState } from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateSelectedAudioDevice } from '../../../../store/slices/roomSettingsSlice';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
} from '../../../../store/slices/bottomIconsActivitySlice';

interface IMicMenuItemsProps {
  currentRoom: Room;
}

const MicMenuItems = ({ currentRoom }: IMicMenuItemsProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const audioDevices = useAppSelector(
    (state) => state.roomSettings.audioDevices,
  );
  const isMicMuted = useAppSelector(
    (state) => state.bottomIconsActivity.isMicMuted,
  );
  const selectedAudioDevice = useAppSelector(
    (state) => state.roomSettings.selectedAudioDevice,
  );

  const [devicesMenu, setDevicesMenu] = useState<Array<React.JSX.Element>>();
  const [newDevice, setNewDevice] = useState<string>();

  useEffect(() => {
    const devicesMenu = audioDevices.map((device, i) => {
      return (
        <div className="" role="none" key={`${device.id}-${i}`}>
          <MenuItem>
            {() => (
              <p
                className={`${
                  selectedAudioDevice === device.id
                    ? 'secondaryColor'
                    : 'text-gray-700 dark:text-darkText'
                } rounded group flex items-center px-3 py-[0.4rem] text-[10px] lg:text-xs transition ease-in hover:bg-primaryColor hover:text-white cursor-pointer`}
                onClick={() => setNewDevice(device.id)}
              >
                {device.label}
              </p>
            )}
          </MenuItem>
        </div>
      );
    });
    setDevicesMenu(devicesMenu);
  }, [audioDevices, selectedAudioDevice]);

  useEffect(() => {
    const changeDevice = async (id: string) => {
      await currentRoom.switchActiveDevice('audioinput', id);
    };
    if (newDevice) {
      changeDevice(newDevice).then();
      dispatch(updateSelectedAudioDevice(newDevice));
    }
  }, [newDevice, currentRoom, dispatch]);

  const muteUnmuteMic = () => {
    currentRoom?.localParticipant.audioTrackPublications.forEach(
      async (publication) => {
        if (
          publication.track &&
          publication.track.source === Track.Source.Microphone
        ) {
          if (publication.isMuted) {
            await publication.track.unmute();
            dispatch(updateIsMicMuted(false));
          } else {
            await publication.track.mute();
            dispatch(updateIsMicMuted(true));
          }
        }
      },
    );
  };

  const leaveMic = () => {
    currentRoom?.localParticipant.audioTrackPublications.forEach(
      async (publication) => {
        if (publication.track && publication.kind === Track.Kind.Audio) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      },
    );
    dispatch(updateIsActiveMicrophone(false));
    dispatch(updateIsMicMuted(false));
    dispatch(updateSelectedAudioDevice(''));
  };

  const menuItems = () => {
    return (
      <MenuItems
        static
        className="origin-bottom-right z-[9999] absolute ltr:left-0 rtl:-left-4 mt-2 w-40 bottom-[40px] rounded-md shadow-lg bg-white dark:bg-darkPrimary ring-1 ring-black dark:ring-secondaryColor ring-opacity-5 divide-y divide-gray-100 dark:divide-secondaryColor focus:outline-none"
      >
        {devicesMenu}
        <div className="" role="none">
          <MenuItem>
            {() => (
              <p
                className="text-gray-700 dark:text-darkText rounded group flex items-center px-3 py-[0.4rem] text-xs transition ease-in hover:bg-primaryColor hover:text-white cursor-pointer"
                onClick={() => muteUnmuteMic()}
              >
                {isMicMuted
                  ? t('footer.menus.unmute-microphone')
                  : t('footer.menus.mute-microphone')}
              </p>
            )}
          </MenuItem>
        </div>
        <div className="" role="none">
          <MenuItem>
            {() => (
              <p
                className="text-red-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs transition ease-in hover:bg-red-400 hover:text-white cursor-pointer"
                onClick={() => leaveMic()}
              >
                {t('footer.menus.leave-microphone')}
              </p>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    );
  };

  return <>{menuItems()}</>;
};

export default MicMenuItems;
