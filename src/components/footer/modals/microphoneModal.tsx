import React, { useEffect, useState, Fragment } from 'react';
import {
  Dialog,
  DialogTitle,
  Button,
  DialogPanel,
  Listbox,
  Transition,
  ListboxOptions,
  ListboxOption,
  ListboxButton,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { getInputMediaDevices } from '../../../helpers/utils';
import { addAudioDevices } from '../../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../../store';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';

interface MicrophoneModalProps {
  show: boolean;
  onCloseMicrophoneModal: (deviceId?: string) => void;
}

const MicrophoneModal = ({
  show,
  onCloseMicrophoneModal,
}: MicrophoneModalProps) => {
  const { t } = useTranslation();
  const [selectedMic, setSelectMic] = useState<string>('');
  const [devices, setDevices] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    const getDeviceMics = async () => {
      const inputDevices = await getInputMediaDevices('audio');
      if (!inputDevices.audio.length) {
        return;
      }

      setDevices(inputDevices.audio);
      setSelectMic(inputDevices.audio[0].id);
      dispatch(addAudioDevices(inputDevices.audio));
    };
    getDeviceMics().then();
  }, [dispatch]);

  const selectOrClose = (onlyClose = false) => {
    onCloseMicrophoneModal(onlyClose ? undefined : selectedMic);
  };

  return (
    <Dialog
      open={show}
      as="div"
      className="relative z-10 focus:outline-none"
      onClose={() => false}
    >
      <div className="SelectMicrophonePopup fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-96 bg-white border border-Gray-200 shadow-virtualPOP p-4 3xl:p-6 rounded-xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
          >
            <DialogTitle
              as="h3"
              className="flex items-center justify-between text-base 3xl:text-lg font-medium 3xl:font-semibold leading-7 text-Gray-950"
            >
              <span>{t('footer.modal.select-microphone')}</span>
              <Button onClick={() => selectOrClose(true)}>
                <PopupCloseSVGIcon classes="text-Gray-600" />
              </Button>
            </DialogTitle>

            <div className="microphone-dropdown mt-4">
              <Listbox value={selectedMic} onChange={setSelectMic}>
                <div className="relative">
                  <ListboxButton className="relative w-full h-10 rounded-[8px] border border-Gray-300 bg-white shadow-input px-3 outline-none focus:border-Blue2-500 focus:shadow-inputFocus text-left text-sm text-Gray-950">
                    <span className="block truncate">
                      {devices.find((d) => d.id === selectedMic)?.label ||
                        t('footer.modal.select-microphone')}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <DropdownIconSVG />
                    </span>
                  </ListboxButton>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdownMenu border border-Gray-100 focus:outline-none scrollBar scrollBar2 grid gap-0.5">
                      {devices.map((device) => (
                        <ListboxOption
                          key={device.id}
                          value={device.id}
                          className={({ focus, selected }) =>
                            `relative cursor-default select-none py-2 px-3 rounded-[8px] ${
                              focus ? 'bg-Blue2-50' : ''
                            } ${selected ? 'bg-Blue2-50' : ''}`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}
                              >
                                {device.label}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                                  <CheckMarkIcon />
                                </span>
                              ) : null}
                            </>
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </Transition>
                </div>
              </Listbox>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow"
                onClick={() => selectOrClose(false)}
              >
                {t('join')}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default MicrophoneModal;
