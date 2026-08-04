import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
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
    <div className="microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-Gray-200 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white">
      <button
        type="button"
        aria-label="Microphone"
        className="w-11 h-11 relative flex items-center justify-center cursor-pointer focus-ring"
        onClick={() =>
          audioDevices.length === 0 ? enableMediaDevices('audio') : disableMic()
        }
      >
        {audioDevices.length === 0 ? (
          <>
            <Microphone classes={'h-5 w-auto'} />
            <span className="add absolute -top-2 -end-2 z-10">
              <PlusIcon />
            </span>
          </>
        ) : (
          <Microphone classes={'h-5 w-auto'} />
        )}
      </button>
      {audioDevices.length > 0 && (
        <div className="menu relative">
          <Menu>
            {({ open }) => (
              <>
                <MenuButton
                  aria-label={t('landing.mic-menu-title').toString()}
                  className={`w-[30px] h-11 flex items-center justify-center border border-Gray-300  rounded-e-2xl focus-ring ${open ? 'bg-Gray-100 dark:bg-Gray-800' : 'bg-Gray-50 dark:bg-Gray-700'}`}
                >
                  <ArrowUp />
                </MenuButton>
                <MenuItems
                  unmount={false}
                  transition
                  className="menu ltr:origin-top-right rtl:origin-top-left z-10 absolute ltr:-left-32 md:ltr:left-0 rtl:right-0 bottom-12 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl overflow-hidden p-2 w-max transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                  <div className="title h-9 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-2 uppercase">
                    {t('landing.mic-menu-title')}
                  </div>
                  {audioDevices.map((device, i) => (
                    <MenuItem key={`${device.id}-${i}`}>
                      {() => (
                        <button
                          type="button"
                          className="min-h-9 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus-ring"
                          onClick={() => setSelectedAudioDevice(device.id)}
                        >
                          <span dir="ltr">{device.label}</span>
                          {selectedAudioDevice === device.id ? (
                            <CheckMarkIcon />
                          ) : (
                            ''
                          )}
                        </button>
                      )}
                    </MenuItem>
                  ))}
                </MenuItems>
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  );
};

export default MicrophoneIcon;
