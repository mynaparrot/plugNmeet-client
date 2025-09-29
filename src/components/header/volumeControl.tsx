import React, { useCallback, useEffect, useState } from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { debounce } from 'es-toolkit';

import {
  updateRoomAudioVolume,
  updateRoomScreenShareAudioVolume,
} from '../../store/slices/roomSettingsSlice';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import { VolumeHeader } from '../../assets/Icons/VolumeHeader';
import { VolumeMutedSVG } from '../../assets/Icons/VolumeMutedSVG';
import RangeSlider from '../../helpers/ui/rangeSlider';

const VolumeControl = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const roomVolume = useAppSelector(
    (state) => state.roomSettings.roomAudioVolume,
  );
  const screenShareVolume = useAppSelector(
    (state) => state.roomSettings.roomScreenShareAudioVolume,
  );
  const participantIds = useAppSelector((state) => state.participants.ids);

  const [localRoomVolume, setLocalRoomVolume] = useState(roomVolume);
  const [localScreenShareVolume, setLocalScreenShareVolume] =
    useState(screenShareVolume);

  // Sync from Redux to local state if the values differ.
  useEffect(() => {
    if (roomVolume !== localRoomVolume) {
      setLocalRoomVolume(roomVolume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomVolume]);

  useEffect(() => {
    if (screenShareVolume !== localScreenShareVolume) {
      setLocalScreenShareVolume(screenShareVolume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenShareVolume]);

  // Debounce updates from local state back to Redux.
  // oxlint-disable-next-line exhaustive-deps
  const debouncedRoomVolumeUpdate = useCallback(
    debounce((newVolume: number) => {
      dispatch(updateRoomAudioVolume(newVolume));
      // Also update all individual participants
      participantIds.forEach((id) => {
        dispatch(
          updateParticipant({ id, changes: { audioVolume: newVolume } }),
        );
      });
    }, 200),
    [dispatch, participantIds],
  );

  // oxlint-disable-next-line exhaustive-deps
  const debouncedScreenShareVolumeUpdate = useCallback(
    debounce((newVolume: number) => {
      dispatch(updateRoomScreenShareAudioVolume(newVolume));
    }, 200),
    [dispatch],
  );

  useEffect(() => {
    debouncedRoomVolumeUpdate(localRoomVolume);
  }, [localRoomVolume, debouncedRoomVolumeUpdate]);

  useEffect(() => {
    debouncedScreenShareVolumeUpdate(localScreenShareVolume);
  }, [localScreenShareVolume, debouncedScreenShareVolumeUpdate]);

  return (
    <Menu>
      {({ open }) => (
        <div>
          <MenuButton
            className={`relative shrink-0 p-0 w-8 h-8 flex items-center justify-center rounded-[10px] ${
              open ? 'bg-Gray-50' : ''
            }`}
          >
            <div className="text-gray-700 dark:text-white cursor-pointer">
              {localRoomVolume > 0 ? <VolumeHeader /> : <VolumeMutedSVG />}
            </div>
          </MenuButton>
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <MenuItems
              static
              className="volume-popup-wrapper origin-top-right z-10 absolute ltr:right-0 top-6 rtl:left-0 mt-2 w-64 py-5 px-2 rounded-md shadow-lg bg-white border-Gray-100 border"
            >
              <p className="text-sm text-Gray-950">
                {t('header.room-audio-volume')}
              </p>
              <section className="flex items-center pl-3">
                <RangeSlider
                  min={0}
                  max={100}
                  value={Math.round(localRoomVolume * 100)}
                  onChange={(v) => setLocalRoomVolume(v / 100)}
                  thumbSize={20}
                  trackHeight={8}
                />
                <p className="w-10 text-center text-sm text-Gray-950 ml-3">
                  {Math.round(localRoomVolume * 100)}
                </p>
                <button className="w-5 h-5">
                  {localRoomVolume > 0 ? (
                    <i className="pnm-speaker text-Gray-950" />
                  ) : (
                    <i className="pnm-speaker-muted  text-Gray-950" />
                  )}
                </button>
              </section>
              <p className="text-sm mt-2 text-Gray-950">
                {t('header.room-screen-share-audio-volume')}
              </p>
              <section className="flex items-center pl-3">
                <RangeSlider
                  min={0}
                  max={100}
                  value={Math.round(localScreenShareVolume * 100)}
                  onChange={(v) => setLocalScreenShareVolume(v / 100)}
                  thumbSize={20}
                  trackHeight={8}
                />
                <p className="w-10 text-center text-sm text-Gray-950 ml-3">
                  {Math.round(localScreenShareVolume * 100)}
                </p>
                <button className="w-5 h-5">
                  {localScreenShareVolume > 0 ? (
                    <i className="pnm-speaker text-Gray-950" />
                  ) : (
                    <i className="pnm-speaker-muted text-Gray-950" />
                  )}
                </button>
              </section>
            </MenuItems>
          </Transition>
        </div>
      )}
    </Menu>
  );
};

export default VolumeControl;
