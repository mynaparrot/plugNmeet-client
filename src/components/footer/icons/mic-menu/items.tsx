import React, { useCallback } from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { NativeMediaSource } from 'plugnmeet-protocol-js';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateSelectedAudioDevice } from '../../../../store/slices/roomSettingsSlice';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { isHybridMode } from '../../../../helpers/nativeBridge';
import {
  unpublishNativeMedia,
  muteNativeMedia,
  unmuteNativeMedia,
} from '../../../../helpers/nativeBridge';
import { CheckMarkIcon } from '../../../../assets/Icons/CheckMarkIcon';
import { Microphone } from '../../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../../assets/Icons/MicrophoneOff';

interface IMicMenuItemsProps {
  currentRoom: Room;
  hybrid?: boolean;
  isLocked?: boolean;
}

const MicMenuItems = ({
  currentRoom,
  hybrid,
  isLocked,
}: IMicMenuItemsProps) => {
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
  const isHybrid = hybrid ?? isHybridMode();

  const handleDeviceChange = useCallback(
    async (deviceId: string) => {
      await currentRoom.switchActiveDevice('audioinput', deviceId);
      dispatch(updateSelectedAudioDevice(deviceId));
    },
    [currentRoom, dispatch],
  );

  const muteUnmuteMic = useCallback(async () => {
    if (isLocked) return;
    if (isHybrid) {
      if (isMicMuted) {
        unmuteNativeMedia(NativeMediaSource.MIC);
      } else {
        muteNativeMedia(NativeMediaSource.MIC);
      }
      return;
    }
    // existing non-hybrid logic...
    if (!currentRoom) return;
    const publication = currentRoom.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (publication && publication.track) {
      if (publication.isMuted) {
        await currentRoom.localParticipant.setMicrophoneEnabled(true);
      } else {
        await currentRoom.localParticipant.setMicrophoneEnabled(false);
      }
    }
  }, [isHybrid, isMicMuted, currentRoom, isLocked]);

  const leaveMic = useCallback(async () => {
    if (isLocked) return;
    if (isHybrid) {
      unpublishNativeMedia(NativeMediaSource.MIC);
      return;
    }
    // existing non-hybrid logic...
    if (!currentRoom) return;
    const publication = currentRoom.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (publication && publication.track) {
      await currentRoom.localParticipant.unpublishTrack(
        publication.track,
        true,
      );
    }
    dispatch(updateIsActiveMicrophone(false));
    dispatch(updateIsMicMuted(false));
    dispatch(updateSelectedAudioDevice(''));
  }, [isHybrid, currentRoom, dispatch, isLocked]);

  return (
    <MenuItems
      static
      className="menu ltr:origin-top-right rtl:origin-top-left z-10 absolute ltr:-left-8 md:ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl overflow-hidden p-2 w-max"
    >
      {!isHybrid && (
        <>
          <div className="title h-8 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-2 uppercase">
            {t('footer.icons.select-microphone')}
          </div>
          {audioDevices.map((device) => (
            <MenuItem key={device.id}>
              {() => (
                <p
                  className={`${
                    selectedAudioDevice === device.id
                      ? 'bg-Gray-50 dark:bg-dark-secondary2'
                      : ''
                  } h-8 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2`}
                  onClick={() => handleDeviceChange(device.id)}
                >
                  <span dir="ltr">{device.label}</span>
                  {selectedAudioDevice === device.id ? <CheckMarkIcon /> : ''}
                </p>
              )}
            </MenuItem>
          ))}
          <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-1"></div>
        </>
      )}
      <div className="" role="none">
        <MenuItem disabled={isLocked}>
          {() => (
            <p
              className="h-8 w-full flex items-center text-sm gap-2 leading-none font-medium text-red-700 px-2 rounded-lg transition-all duration-300 hover:bg-Red-600 hover:text-white"
              onClick={muteUnmuteMic}
            >
              {isMicMuted ? (
                <>
                  <Microphone classes={'h-4 w-auto'} />
                  {t('footer.menus.unmute-microphone')}
                </>
              ) : (
                <>
                  <MicrophoneOff classes={'h-4 w-auto'} />
                  {t('footer.menus.mute-microphone')}
                </>
              )}
            </p>
          )}
        </MenuItem>
      </div>
      <div className="" role="none">
        <MenuItem disabled={isLocked}>
          {() => (
            <p
              className="group h-8 w-full flex items-center text-sm gap-2 leading-none font-medium px-2 rounded-lg transition-all duration-300 hover:bg-Red-600 hover:text-white text-red-700"
              onClick={leaveMic}
            >
              <i className="pnm-logout text-base transition ease-in" />
              {t('footer.menus.leave-microphone')}
            </p>
          )}
        </MenuItem>
      </div>
    </MenuItems>
  );
};

export default MicMenuItems;
