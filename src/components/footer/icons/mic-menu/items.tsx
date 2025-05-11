import React, { ReactElement, useEffect, useState } from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateSelectedAudioDevice } from '../../../../store/slices/roomSettingsSlice';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { CheckMarkIcon } from '../../../../assets/Icons/CheckMarkIcon';

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

  const [devicesMenu, setDevicesMenu] = useState<Array<ReactElement>>();
  const [newDevice, setNewDevice] = useState<string>();

  useEffect(() => {
    const devicesMenu = audioDevices.map((device, i) => {
      return (
        <div className="" role="none" key={`${device.id}-${i}`}>
          <MenuItem>
            {() => (
              <p
                className={`${
                  selectedAudioDevice === device.id ? 'bg-Gray-50' : ''
                } h-8 3xl:h-10 w-full flex items-center text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50`}
                onClick={() => setNewDevice(device.id)}
              >
                {device.label}
                {selectedAudioDevice === device.id ? <CheckMarkIcon /> : ''}
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

  return (
    <MenuItems
      static
      className="menu origin-top-right z-10 absolute ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2 w-max"
    >
      <div className="title h-8 3xl:h-10 w-full flex items-center text-xs 3xl:text-sm leading-none text-Gray-700 px-3 uppercase">
        Select Microphone
      </div>
      {devicesMenu}
      <div className="" role="none">
        <MenuItem>
          {() => (
            <p
              className="h-8 3xl:h-10 w-full flex items-center text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50"
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
              className="h-8 3xl:h-10 w-full flex items-center text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50 hover:text-red-700"
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

export default MicMenuItems;
