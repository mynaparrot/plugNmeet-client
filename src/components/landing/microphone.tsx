import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import { Microphone } from '../../assets/Icons/Microphone';
import { IMediaDevice } from '../../store/slices/interfaces/roomSettings';
import { inputMediaDeviceKind } from '../../helpers/utils';

interface MicrophoneIconProps {
  audioDevices: IMediaDevice[];
  enableMediaDevices(type: inputMediaDeviceKind): Promise<void>;
  disableMic(): void;
  setSelectedAudioDevice: (value: SetStateAction<string>) => void;
  selectedAudioDevice: string;
}

const MicrophoneIcon = ({
  audioDevices,
  setSelectedAudioDevice,
  selectedAudioDevice,
  enableMediaDevices,
  disableMic,
}: MicrophoneIconProps) => {
  const { t } = useTranslation();

  return (
    <div className="microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950">
      <div
        className="w-11 h-11 relative flex items-center justify-center"
        onClick={() =>
          audioDevices.length === 0 ? enableMediaDevices('audio') : disableMic()
        }
      >
        {audioDevices.length === 0 ? (
          <>
            <Microphone classes={'h-5 w-auto'} />
            <span className="add absolute -top-2 -right-2 z-10">
              <PlusIcon />
            </span>
          </>
        ) : (
          <Microphone classes={'h-5 w-auto'} />
        )}
      </div>
      {audioDevices.length > 0 && (
        <div className="menu relative">
          <Menu>
            {({ open }) => (
              <>
                <MenuButton
                  className={`w-[30px] h-11 flex items-center justify-center border border-Gray-300  rounded-r-2xl ${open ? 'bg-Gray-100' : 'bg-Gray-50'}`}
                >
                  <ArrowUp />
                </MenuButton>
                <Transition
                  as={'div'}
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <div className="menu origin-top-right z-10 absolute ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2 w-max">
                    <div className="title h-10 w-full flex items-center text-sm leading-none text-Gray-700 px-3 uppercase">
                      {t('landing.mic-menu-title')}
                    </div>
                    {audioDevices.map((device, i) => (
                      <div
                        className=""
                        role="none"
                        key={`${device.id}-${i}`}
                        onClick={() => setSelectedAudioDevice(device.id)}
                      >
                        <MenuItem>
                          {() => (
                            <p className="h-10 w-full flex items-center text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50">
                              {device.label}
                              {selectedAudioDevice === device.id ? (
                                <CheckMarkIcon />
                              ) : (
                                ''
                              )}
                            </p>
                          )}
                        </MenuItem>
                      </div>
                    ))}
                  </div>
                </Transition>
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  );
};

export default MicrophoneIcon;
