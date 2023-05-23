import React, { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'lodash';
import { Listbox, Transition } from '@headlessui/react';

import { getDevices } from '../../../helpers/utils';
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
  const [devices, setDevices] = useState<Array<JSX.Element>>([]);

  useEffect(() => {
    const getDeviceMics = async () => {
      const mics = await getDevices('audioinput');
      const audioDevices: Array<IMediaDevice> = [];

      const options = mics.map((mic) => {
        const device: IMediaDevice = {
          id: mic.deviceId,
          label: mic.label,
        };
        audioDevices.push(device);

        return (
          <>
            <Listbox.Option
              className={({ active }) =>
                `relative cursor-default select-none py-2 pl-7 pr-4 ${
                  active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                }`
              }
              key={mic.deviceId}
              value={mic.label}
              disabled={disabled}
            >
              {({ selected }) => (
                <>
                  <span
                    className={`block truncate ${
                      selected ? 'font-medium' : 'font-normal'
                    }`}
                  >
                    {mic.label}
                  </span>
                  {selected ? (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </span>
                  ) : null}
                </>
              )}
            </Listbox.Option>
          </>
        );
      });

      setDevices(options);
      if (isEmpty(selectedMicDevice)) {
        setSelectedMicDevice(audioDevices[0].id);
      }
    };
    getDeviceMics();
    //eslint-disable-next-line
  }, []);

  return (
    <div className="selectMicroPhone flex items-center justify-between mt-2">
      <label
        htmlFor="microphone"
        className="pr-4 w-min dark:text-darkText text-sm"
      >
        {t('footer.modal.select-microphone')}
      </label>
      <div className="relative mt-1 w-[150px] sm:w-[200px]">
        {/* <select
          value={selectedMicDevice}
          disabled={disabled}
          onChange={(e) => setSelectedMicDevice(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-transparent dark:border-darkText dark:text-darkText rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {devices}
        </select> */}

        <Listbox
          value={selectedMicDevice}
          onChange={setSelectedMicDevice}
          disabled={disabled}
        >
          <div className="relative mt-1 w-[150px] sm:w-[200px]">
            <Listbox.Button
              className={`relative h-9 w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-darkText dark:text-darkText bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm`}
            >
              <span className="block truncate">{selectedMicDevice}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                  />
                </svg>
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full scrollBar scrollBar4 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {devices}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>
    </div>
  );
};

export default MicElms;
