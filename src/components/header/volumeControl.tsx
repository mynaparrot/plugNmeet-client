import { useCallback, useEffect, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
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
    <Popover className="relative">
      <PopoverButton className="relative shrink-0 p-0 w-7 md:w-8 h-7 md:h-8 flex items-center justify-center rounded-[10px] focus-ring data-[open]:bg-Gray-50 data-[open]:dark:bg-Gray-800">
        <div className="text-gray-700 dark:text-white cursor-pointer">
          {localRoomVolume > 0 ? <VolumeHeader /> : <VolumeMutedSVG />}
        </div>
      </PopoverButton>
      <PopoverPanel
        anchor="bottom end"
        transition
        className="volume-popup-wrapper z-10 w-64 py-5 px-2 rounded-md shadow-lg bg-white dark:bg-dark-primary border-Gray-100 dark:border-Gray-700 border focus:outline-hidden [--anchor-gap:8px] transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
      >
        <p className="text-sm text-Gray-950 dark:text-white">
          {t('header.room-audio-volume')}
        </p>
        <section className="flex items-center ps-3">
          <RangeSlider
            min={0}
            max={100}
            value={Math.round(localRoomVolume * 100)}
            onChange={(v) => setLocalRoomVolume(v / 100)}
            thumbSize={20}
            trackHeight={8}
          />
          <p className="w-10 text-center text-sm text-Gray-950 dark:text-white ms-3">
            {Math.round(localRoomVolume * 100)}
          </p>
          <span aria-hidden="true" className="w-5 h-5">
            {localRoomVolume > 0 ? (
              <i className="pnm-speaker text-Gray-950 dark:text-white" />
            ) : (
              <i className="pnm-speaker-muted  text-Gray-950 dark:text-white" />
            )}
          </span>
        </section>
        <p className="text-sm mt-2 text-Gray-950 dark:text-white">
          {t('header.room-screen-share-audio-volume')}
        </p>
        <section className="flex items-center ps-3">
          <RangeSlider
            min={0}
            max={100}
            value={Math.round(localScreenShareVolume * 100)}
            onChange={(v) => setLocalScreenShareVolume(v / 100)}
            thumbSize={20}
            trackHeight={8}
          />
          <p className="w-10 text-center text-sm text-Gray-950 dark:text-white ms-3">
            {Math.round(localScreenShareVolume * 100)}
          </p>
          <span aria-hidden="true" className="w-5 h-5">
            {localScreenShareVolume > 0 ? (
              <i className="pnm-speaker text-Gray-950 dark:text-white" />
            ) : (
              <i className="pnm-speaker-muted text-Gray-950 dark:text-white" />
            )}
          </span>
        </section>
      </PopoverPanel>
    </Popover>
  );
};

export default VolumeControl;
