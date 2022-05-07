import React, { useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { RemoteParticipant } from 'livekit-client';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface MicIconProps {
  userId: string;
  remoteParticipant?: RemoteParticipant;
}

const MicIcon = ({ userId, remoteParticipant }: MicIconProps) => {
  const [volume, setVolume] = useState<number>(1);

  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  useEffect(() => {
    remoteParticipant?.setVolume(volume);
    //eslint-disable-next-line
  }, [volume]);

  const renderUnmuteIcon = () => {
    return (
      <div className="mic mr-2 cursor-pointer">
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button>
                <i className="pnm-mic-unmute secondaryColor opacity-50 text-[8px]" />
              </Menu.Button>

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
                  className="volume-popup-wrapper origin-top-right z-10 absolute right-0 top-0 mt-2 w-64 py-5 px-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
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
      </div>
    );
  };

  const render = () => {
    if (participant?.audioTracks) {
      if (participant.isMuted) {
        return (
          <div className="mic muted mr-2 cursor-pointer">
            <i className="pnm-mic-mute secondaryColor opacity-50 text-[8px]" />
          </div>
        );
      }
      // if this user is a remote Participant then we can control volume.
      if (remoteParticipant) {
        return renderUnmuteIcon();
      }
      // for local user don't need
      return (
        <div className="mic mr-2 cursor-pointer">
          <i className="pnm-mic-unmute secondaryColor opacity-50 text-[8px]" />
        </div>
      );
    }

    return null;
  };

  return render();
};

export default MicIcon;
