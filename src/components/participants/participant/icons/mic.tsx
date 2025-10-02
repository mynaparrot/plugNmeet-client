import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';
import { debounce } from 'es-toolkit';

import { useAppDispatch, useAppSelector } from '../../../../store';
import {
  participantsSelector,
  updateParticipant,
} from '../../../../store/slices/participantSlice';
import { Microphone } from '../../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../../assets/Icons/MicrophoneOff';
import IconWrapper from './iconWrapper';
import RangeSlider from '../../../../helpers/ui/rangeSlider';

interface MicIconProps {
  userId: string;
  isRemoteParticipant: boolean;
}

const MicIcon = ({ userId, isRemoteParticipant }: MicIconProps) => {
  const audioTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioTracks,
  );
  const isMuted = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.isMuted,
  );
  const audioVolume = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioVolume,
  );

  const [volume, setVolume] = useState<number>(audioVolume ?? 1);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Sync from store to local state, but only if the value is actually different.
    // This prevents the infinite loop by ignoring the "echo" of our own update.
    if (typeof audioVolume !== 'undefined' && audioVolume !== volume) {
      setVolume(audioVolume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioVolume]);

  // Create a debounced version of the dispatch function.
  // This will only run 200ms after the last time it was called.
  // oxlint-disable-next-line exhaustive-deps
  const debouncedUpdate = useCallback(
    debounce((newVolume: number) => {
      dispatch(
        updateParticipant({
          id: userId,
          changes: { audioVolume: newVolume },
        }),
      );
    }, 200),
    [dispatch, userId],
  );

  useEffect(() => {
    // When volume changes, call the debounced function.
    debouncedUpdate(volume);
  }, [volume, debouncedUpdate]);

  const renderVolumeControl = useCallback(() => {
    return (
      <div className="mic-unmute-wrapper relative flex items-center justify-center">
        <Menu>
          {({ open }) => (
            <>
              <MenuButton>
                {volume ? (
                  <Microphone classes="h-3 3xl:h-4 w-auto" />
                ) : (
                  <MicrophoneOff classes="h-3 3xl:h-4 w-auto" />
                )}
              </MenuButton>

              <Transition
                show={open}
                // enter="transition duration-100 ease-out"
                // enterFrom="transform scale-95 opacity-0"
                // enterTo="transform scale-100 opacity-100 relative z-10"
                // leave="transition duration-75 ease-out"
                // leaveFrom="transform scale-100 opacity-100"
                // leaveTo="transform scale-95 opacity-0"
              >
                <MenuItems
                  static
                  className="volume-popup-wrapper z-10 absolute ltr:-right-6 rtl:-left-6 top-3 mt-2 w-48 xl:w-60 py-4 px-2 rounded-md shadow-virtual-pOP bg-white ring-1 ring-Gray-100 focus:outline-hidden"
                >
                  <section className="flex items-center">
                    <div className="flex-1 px-1">
                      <RangeSlider
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(newValue) => {
                          setVolume(newValue / 100);
                        }}
                        thumbSize={16}
                        trackHeight={4}
                      />
                    </div>
                    <p className="w-10 text-center text-sm">
                      {Math.round(volume * 100)}
                    </p>
                    <button className="w-5 h-5">
                      {volume ? (
                        <Microphone classes="h-3 3xl:h-4 w-auto" />
                      ) : (
                        <MicrophoneOff classes="h-3 3xl:h-4 w-auto" />
                      )}
                    </button>
                  </section>
                </MenuItems>
              </Transition>
            </>
          )}
        </Menu>
      </div>
    );
  }, [volume]);

  const render = useMemo(() => {
    if (audioTracks > 0) {
      if (isMuted) {
        return <MicrophoneOff classes={'h-4 w-auto'} />;
      }
      // if this user is a remote Participant, then we can control volume.
      if (isRemoteParticipant) {
        return renderVolumeControl();
      }
      // for local user don't need
      return <Microphone classes={'h-4 w-auto'} />;
    }

    return null;
  }, [isRemoteParticipant, renderVolumeControl, audioTracks, isMuted]);

  return render ? <IconWrapper>{render}</IconWrapper> : null;
};

export default MicIcon;
