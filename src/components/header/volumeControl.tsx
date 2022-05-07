import React, { useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import throttle from 'lodash/throttle';

import useStorePreviousInt from '../../helpers/hooks/useStorePreviousInt';
import { RemoteParticipant } from 'livekit-client';
import { updateAudioVolume } from '../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../store';

interface IVolumeControlProps {
  remoteParticipants?: Map<string, RemoteParticipant>;
}

const VolumeControl = ({ remoteParticipants }: IVolumeControlProps) => {
  const dispatch = useAppDispatch();
  const [volume, setVolume] = useState<number>(1);
  const previousVolume = useStorePreviousInt(volume);

  useEffect(() => {
    if (previousVolume && volume !== previousVolume) {
      if (remoteParticipants?.size) {
        updateVolume();
      }
      dispatch(updateAudioVolume(volume));
    }
    //eslint-disable-next-line
  }, [volume, previousVolume, remoteParticipants]);

  const updateVolume = throttle(() => {
    remoteParticipants?.forEach((participant) => participant.setVolume(volume));
  }, 100);

  const render = () => {
    return (
      <Menu>
        {({ open }) => (
          <>
            <Menu.Button className="relative flex-shrink-0 p-2">
              <div className="h-4 w-4">
                <i className="pnm-speaker primaryColor" />
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
                    <i className="pnm-speaker primaryColor" />
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
