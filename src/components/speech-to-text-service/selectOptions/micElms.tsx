import React, { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';

import { getInputMediaDevices } from '../../../helpers/utils';
import { IMediaDevice } from '../../../store/slices/interfaces/roomSettings';

interface MicElmsProps {
  disabled: boolean;
  selectedMicDevice: string;
  setSelectedMicDevice: React.Dispatch<string>;
}

const MicElms = ({
  disabled,
  selectedMicDevice,
  setSelectedMicDevice,
}: MicElmsProps) => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<IMediaDevice[]>([]);

  useEffect(() => {
    const getDeviceMics = async () => {
      const inputDevices = await getInputMediaDevices('audio');
      if (inputDevices.audio.length) {
        setDevices(inputDevices.audio);
        if (isEmpty(selectedMicDevice)) {
          setSelectedMicDevice(inputDevices.audio[0].id);
        }
      }
    };
    getDeviceMics().then();
    //eslint-disable-next-line
  }, []);

  const render = () => {
    if (!devices.length) {
      return null;
    }
    return (
      <div className="selectMicroPhone flex items-center justify-between mt-2">
        <label
          htmlFor="microphone"
          className="pr-4 w-min dark:text-dark-text text-sm"
        >
          {t('footer.modal.select-microphone')}
        </label>
        <div className="relative mt-1 w-[150px] sm:w-[250px]">
          <Listbox
            value={selectedMicDevice}
            onChange={setSelectedMicDevice}
            disabled={disabled}
          >
            <div className="relative">
              <ListboxButton
                className={`relative min-h-[36px] w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-dark-text dark:text-dark-text bg-transparent rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 text-sm`}
              >
                <span className="block text-xs">
                  {devices.find((d) => d.id === selectedMicDevice)?.label}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                  <i className="pnm-updown text-xl primaryColor dark:text-dark-text" />
                </span>
              </ListboxButton>

              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full scrollBar scrollBar4 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-hidden sm:text-sm">
                  {devices.map((d) => {
                    return (
                      <ListboxOption
                        className={({ focus }) =>
                          `relative cursor-default select-none py-2 pl-7 pr-4 ${
                            focus
                              ? 'bg-amber-100 text-amber-900'
                              : 'text-gray-900'
                          }`
                        }
                        key={d.id}
                        value={d.id}
                        disabled={disabled}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block text-xs ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {d.label}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                                <i className="pnm-check w-4 h-4" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </ListboxOption>
                    );
                  })}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>
      </div>
    );
  };

  return render();
};

export default MicElms;
