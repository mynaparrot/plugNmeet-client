import React, { useCallback } from 'react';
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

  const handleDeviceChange = useCallback(
    async (deviceId: string) => {
      await currentRoom.switchActiveDevice('audioinput', deviceId);
      dispatch(updateSelectedAudioDevice(deviceId));
    },
    [currentRoom, dispatch],
  );

  const muteUnmuteMic = useCallback(async () => {
    if (!currentRoom) return;
    for (const publication of currentRoom.localParticipant.audioTrackPublications.values()) {
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
    }
  }, [currentRoom, dispatch]);

  const leaveMic = useCallback(async () => {
    if (!currentRoom) return;
    for (const publication of currentRoom.localParticipant.audioTrackPublications.values()) {
      if (publication.track && publication.kind === Track.Kind.Audio) {
        if (publication.track) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }
    }
    dispatch(updateIsActiveMicrophone(false));
    dispatch(updateIsMicMuted(false));
    dispatch(updateSelectedAudioDevice(''));
  }, [currentRoom, dispatch]);

  return (
    <MenuItems
      static
      className="menu origin-top-right z-10 absolute ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2 w-max"
    >
      <div className="title h-8 3xl:h-10 w-full flex items-center text-xs 3xl:text-sm leading-none text-Gray-700 px-3 uppercase">
        Select Microphone
      </div>
      {audioDevices.map((device) => (
        <MenuItem key={device.id}>
          {() => (
            <p
              className={`${
                selectedAudioDevice === device.id ? 'bg-Gray-50' : ''
              } h-8 3xl:h-10 w-full flex items-center text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50`}
              onClick={() => handleDeviceChange(device.id)}
            >
              {device.label}
              {selectedAudioDevice === device.id ? <CheckMarkIcon /> : ''}
            </p>
          )}
        </MenuItem>
      ))}
      <div className="" role="none">
        <MenuItem>
          {() => (
            <p
              className="h-8 3xl:h-10 w-full flex items-center text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50"
              onClick={muteUnmuteMic}
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
              onClick={leaveMic}
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
