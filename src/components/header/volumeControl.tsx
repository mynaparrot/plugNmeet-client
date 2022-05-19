import React, { useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';
import { Room } from 'livekit-client';

import useStorePreviousInt from '../../helpers/hooks/useStorePreviousInt';
import { updateRoomAudioVolume } from '../../store/slices/roomSettingsSlice';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';

interface IVolumeControlProps {
  currentRoom: Room;
}

const isActiveParticipantsPanelSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveParticipantsPanel,
  (isActiveParticipantsPanel) => isActiveParticipantsPanel,
);

const VolumeControl = ({ currentRoom }: IVolumeControlProps) => {
  const dispatch = useAppDispatch();
  const [volume, setVolume] = useState<number>(
    store.getState().roomSettings.roomAudioVolume,
  );
  const previousVolume = useStorePreviousInt(volume);
  const isActiveParticipantsPanel = useAppSelector(
    isActiveParticipantsPanelSelector,
  );

  useEffect(() => {
    if (previousVolume && volume !== previousVolume) {
      if (isActiveParticipantsPanel) {
        dispatch(updateRoomAudioVolume(volume));
      } else {
        currentRoom.participants.forEach((p) => {
          if (p.audioTracks.size > 0) {
            p.setVolume(volume);
          }
        });
      }
    }
    //eslint-disable-next-line
  }, [volume, previousVolume, dispatch, isActiveParticipantsPanel]);

  const render = () => {
    return (
      <Menu>
        {({ open }) => (
          <>
            <Menu.Button className="relative flex-shrink-0 p-2">
              <div className="h-4 w-4 -mt-[2px]">
                {volume > 0 ? (
                  <i className="pnm-speaker primaryColor" />
                ) : (
                  <i className="pnm-speaker-muted primaryColor" />
                )}
              </div>
            </Menu.Button>

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
              <Menu.Items
                static
                className="volume-popup-wrapper origin-top-right z-10 absolute right-0 top-4 mt-2 w-64 py-5 px-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
              >
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
                  <p className="w-10 text-center text-sm">
                    {Math.round(volume * 100)}
                  </p>
                  <button className="w-5 h-5">
                    {volume > 0 ? (
                      <i className="pnm-speaker primaryColor" />
                    ) : (
                      <i className="pnm-speaker-muted primaryColor" />
                    )}
                  </button>
                </section>
              </Menu.Items>
            </Transition>
          </>
        )}
      </Menu>
    );
  };

  return render();
};

export default VolumeControl;
