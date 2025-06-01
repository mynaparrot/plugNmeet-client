import React, { useEffect, useState } from 'react';
import { Menu, MenuButton, Transition, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import useStorePreviousInt from '../../helpers/hooks/useStorePreviousInt';
import {
  updateRoomAudioVolume,
  updateRoomScreenShareAudioVolume,
} from '../../store/slices/roomSettingsSlice';
import { store, useAppDispatch } from '../../store';
import { updateParticipant } from '../../store/slices/participantSlice';
import { VolumeHeader } from '../../assets/Icons/VolumeHeader';

const VolumeControl = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [volume, setVolume] = useState<number>(
    store.getState().roomSettings.roomAudioVolume,
  );
  const [screenShareAudioVolume, setScreenShareAudioVolume] = useState<number>(
    store.getState().roomSettings.roomScreenShareAudioVolume,
  );
  const previousVolume = useStorePreviousInt(volume);
  const previousScreenShareAudioVolume = useStorePreviousInt(
    screenShareAudioVolume,
  );

  useEffect(() => {
    if (previousVolume && volume !== previousVolume) {
      dispatch(updateRoomAudioVolume(volume));

      const participantIds = store.getState().participants.ids;
      participantIds.forEach((id) => {
        dispatch(
          updateParticipant({
            id: id,
            changes: {
              audioVolume: volume,
            },
          }),
        );
      });
    }
    //eslint-disable-next-line
  }, [volume, previousVolume]);

  useEffect(() => {
    if (
      previousScreenShareAudioVolume &&
      screenShareAudioVolume !== previousScreenShareAudioVolume
    ) {
      dispatch(updateRoomScreenShareAudioVolume(screenShareAudioVolume));
    }
    //eslint-disable-next-line
  }, [screenShareAudioVolume, previousScreenShareAudioVolume]);

  const render = () => {
    return (
      <Menu>
        {({ open }) => (
          <div>
            <MenuButton className="relative shrink-0 p-2">
              <div className="">
                {volume > 0 ? (
                  <VolumeHeader />
                ) : (
                  <i className="pnm-speaker-muted text-Gray-950" />
                )}
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
                className="volume-popup-wrapper origin-top-right z-10 absolute ltr:right-0 rtl:left-0 top-4 mt-2 w-64 py-5 px-2 rounded-md shadow-lg bg-white dark:bg-dark-primary/90 ring-1 ring-black dark:ring-secondary-color ring-opacity-5 divide-y divide-gray-100 focus:outline-hidden"
              >
                <p className="text-sm dark:text-dark-text">
                  {t('header.room-audio-volume')}
                </p>
                <section className="flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(event) => {
                      setVolume(event.target.valueAsNumber);
                    }}
                    className="range flex-1"
                  />
                  <p className="w-10 text-center text-sm dark:text-white">
                    {Math.round(volume * 100)}
                  </p>
                  <button className="w-5 h-5">
                    {volume > 0 ? (
                      <i className="pnm-speaker primaryColor dark:text-secondary-color" />
                    ) : (
                      <i className="pnm-speaker-muted primaryColor dark:text-secondary-color" />
                    )}
                  </button>
                </section>
                <p className="text-sm dark:text-dark-text mt-2">
                  {t('header.room-screen-share-audio-volume')}
                </p>
                <section className="flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={screenShareAudioVolume}
                    onChange={(event) => {
                      setScreenShareAudioVolume(event.target.valueAsNumber);
                    }}
                    className="range flex-1"
                  />
                  <p className="w-10 text-center text-sm dark:text-white">
                    {Math.round(screenShareAudioVolume * 100)}
                  </p>
                  <button className="w-5 h-5">
                    {screenShareAudioVolume > 0 ? (
                      <i className="pnm-speaker primaryColor dark:text-secondary-color" />
                    ) : (
                      <i className="pnm-speaker-muted primaryColor dark:text-secondary-color" />
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
