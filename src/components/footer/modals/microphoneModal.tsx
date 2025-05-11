import React, { ReactElement, useEffect, useState } from 'react';
import { Dialog, DialogTitle, Button, DialogPanel } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { getInputMediaDevices } from '../../../helpers/utils';
import { addAudioDevices } from '../../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../../store';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

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
  const [devices, setDevices] = useState<Array<ReactElement>>([]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const getDeviceMics = async () => {
      const inputDevices = await getInputMediaDevices('audio');
      if (!inputDevices.audio.length) {
        return;
      }

      const options = inputDevices.audio.map((mic) => {
        return (
          <option value={mic.id} key={mic.id}>
            {mic.label}
          </option>
        );
      });

      setDevices(options);
      setSelectMic(inputDevices.audio[0].id);
      dispatch(addAudioDevices(inputDevices.audio));
    };
    getDeviceMics().then();
  }, [dispatch]);

  const selectOrClose = (onlyClose = false) => {
    onCloseMicrophoneModal(onlyClose ? undefined : selectedMic);
  };

  return (
    <>
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
              className="w-full max-w-80 3xl:max-w-96 bg-white border border-Gray-200 shadow-virtualPOP p-4 3xl:p-6 rounded-xl overflow-hidden duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
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
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectMic(e.target.value)}
                  className="block w-full py-2 px-3 border border-Gray-300 text-Gray-700 bg-transparent rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {devices}
                </select>
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
    </>
  );
};

export default MicrophoneModal;
