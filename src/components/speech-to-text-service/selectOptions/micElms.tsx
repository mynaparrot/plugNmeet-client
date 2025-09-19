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
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';

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
      <div className="selectMicroPhone">
        <label
          htmlFor="microphone"
          className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right mb-2 block"
        >
          {t('footer.modal.select-microphone')}
        </label>
        <Listbox
          value={selectedMicDevice}
          onChange={setSelectedMicDevice}
          disabled={disabled}
        >
          <div className="relative w-full">
            <ListboxButton
              className={`min-h-11 full rounded-2xl border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950`}
            >
              <span className="block">
                {devices.find((d) => d.id === selectedMicDevice)?.label}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                <DropdownIconSVG />
              </span>
            </ListboxButton>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5">
                {devices.map((d) => {
                  return (
                    <ListboxOption
                      className={({ focus, selected }) =>
                        `relative cursor-default select-none py-2 px-3 rounded-[8px] truncate ${
                          focus ? 'bg-Blue2-50' : ''
                        } ${selected ? 'bg-Blue2-50' : ''}`
                      }
                      key={d.id}
                      value={d.id}
                      disabled={disabled}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block`}>{d.label}</span>
                          {selected ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                              <CheckMarkIcon />
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
    );
  };

  return render();
};

export default MicElms;
