import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';

import { useAppDispatch, useAppSelector } from '../../../../store';
import {
  participantsSelector,
  updateParticipant,
} from '../../../../store/slices/participantSlice';
import useStorePreviousInt from '../../../../helpers/hooks/useStorePreviousInt';

interface MicIconProps {
  userId: string;
  isRemoteParticipant: boolean;
}

const MicIcon = ({ userId, isRemoteParticipant }: MicIconProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const [volume, setVolume] = useState<number>(participant?.audioVolume ?? 1);
  const previousVolume = useStorePreviousInt(volume);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof participant?.audioVolume !== 'undefined') {
      setVolume(participant?.audioVolume);
    }
  }, [participant?.audioVolume]);

  useEffect(() => {
    if (previousVolume && volume !== previousVolume) {
      dispatch(
        updateParticipant({
          id: userId,
          changes: {
            audioVolume: volume,
          },
        }),
      );
    }
    //eslint-disable-next-line
  }, [volume, previousVolume]);

  const renderUnmuteIcon = useCallback(() => {
    return (
      <div className="mic ltr:mr-2 rtl:ml-2 cursor-pointer">
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button>
                <i className="pnm-mic-unmute secondaryColor text-[10px]" />
              </Menu.Button>

              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100 relative z-10"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Menu.Items
                  static
                  className="volume-popup-wrapper origin-top-right z-10 absolute ltr:-right-6 rtl:-left-6 -top-2 mt-2 w-48 xl:w-60 py-5 px-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
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
  }, [volume]);

  const render = useMemo(() => {
    if (participant?.audioTracks) {
      if (participant.isMuted) {
        return (
          <div className="mic muted mr-2 cursor-pointer">
            <i className="pnm-mic-mute secondaryColor text-[10px]" />
          </div>
        );
      }
      // if this user is a remote Participant then we can control volume.
      if (isRemoteParticipant) {
        return renderUnmuteIcon();
      }
      // for local user don't need
      return (
        <div className="mic mr-2 cursor-pointer">
          <i className="pnm-mic-unmute secondaryColor text-[10px]" />
        </div>
      );
    }

    return null;
  }, [
    isRemoteParticipant,
    renderUnmuteIcon,
    participant?.audioTracks,
    participant?.isMuted,
  ]);

  return <>{render}</>;
};

export default MicIcon;
