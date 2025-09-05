import React, { useMemo } from 'react';
import { Menu, MenuButton, Transition, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { throttle } from 'es-toolkit';

import {
  updateRoomAudioVolume,
  updateRoomScreenShareAudioVolume,
} from '../../store/slices/roomSettingsSlice';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import { VolumeHeader } from '../../assets/Icons/VolumeHeader';
import { VolumeMutedSVG } from '../../assets/Icons/VolumeMutedSVG';
import RangeSlider from '../../helpers/libs/rangeSlider';

const VolumeControl = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const volume = useAppSelector((state) => state.roomSettings.roomAudioVolume);
  const screenShareAudioVolume = useAppSelector(
    (state) => state.roomSettings.roomScreenShareAudioVolume,
  );
  const participantIds = useAppSelector((state) => state.participants.ids);

  const handleVolumeChange = useMemo(() => {
    const throttled = (newVolume: number) => {
      const adjustedVolume = newVolume / 100;
      dispatch(updateRoomAudioVolume(adjustedVolume));

      participantIds.forEach((id) => {
        dispatch(
          updateParticipant({
            id: id,
            changes: {
              audioVolume: adjustedVolume,
            },
          }),
        );
      });
    };
    return throttle(throttled, 100);
  }, [dispatch, participantIds]);

  const handleScreenShareVolumeChange = useMemo(() => {
    const throttled = (newVolume: number) => {
      dispatch(updateRoomScreenShareAudioVolume(newVolume / 100));
    };
    return throttle(throttled, 100);
  }, [dispatch]);

  const render = () => {
    return (
      <Menu>
        {({ open }) => (
          <div>
            <MenuButton
              className={`relative shrink-0 p-0 w-8 h-8 flex items-center justify-center rounded-[10px] ${open ? 'bg-Gray-50' : null}`}
            >
              <div className="text-gray-700 dark:text-white cursor-pointer">
                {volume > 0 ? <VolumeHeader /> : <VolumeMutedSVG />}
              </div>
            </MenuButton>

            {/* Use the Transition component. */}
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
                    value={volume * 100}
                    onChange={handleVolumeChange}
                    thumbSize={20}
                    trackHeight={8}
                  />
                  <p className="w-10 text-center text-sm text-Gray-950 ml-3">
                    {Math.round(volume * 100)}
                  </p>
                  <button className="w-5 h-5">
                    {volume > 0 ? (
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
                    value={screenShareAudioVolume * 100}
                    onChange={handleScreenShareVolumeChange}
                    thumbSize={20}
                    trackHeight={8}
                  />
                  <p className="w-10 text-center text-sm text-Gray-950 ml-3">
                    {Math.round(screenShareAudioVolume * 100)}
                  </p>
                  <button className="w-5 h-5">
                    {screenShareAudioVolume > 0 ? (
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

  return render();
};

export default VolumeControl;
