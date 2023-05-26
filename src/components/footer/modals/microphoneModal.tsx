import React, { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { getDevices } from '../../../helpers/utils';
import { IMediaDevice } from '../../../store/slices/interfaces/roomSettings';
import { addAudioDevices } from '../../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../../store';

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
  const [devices, setDevices] = useState<Array<JSX.Element>>([]);
  const dispatch = useAppDispatch();

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
          <option value={mic.deviceId} key={mic.deviceId}>
            {mic.label}
          </option>
        );
      });

      setDevices(options);
      setSelectMic(mics[0].deviceId);

      if (audioDevices.length) {
        dispatch(addAudioDevices(audioDevices));
      }
    };
    getDeviceMics();
  }, [dispatch]);

  const selectOrClose = (onlyClose = false) => {
    onCloseMicrophoneModal(onlyClose ? undefined : selectedMic);
  };

  const render = () => {
    return (
      <Transition
        show={show}
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Dialog
          open={show}
          onClose={() => false}
          className="share-microphone-popup-wrap fixed z-[99999] inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="popup-inner bg-white dark:bg-darkPrimary w-full max-w-sm rounded-3xl shadow-header relative px-6 py-14">
              <button
                className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                type="button"
                onClick={() => selectOrClose(true)}
              >
                <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
              </button>
              <Dialog.Title className="mb-6 dark:text-darkText">
                {t('footer.modal.select-microphone')}
              </Dialog.Title>

              <div className="col-span-6 sm:col-span-3">
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectMic(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-transparent dark:border-darkText dark:text-darkText rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {devices}
                </select>
              </div>

              <div className="py-3 text-right">
                <button
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primaryColor hover:bg-secondaryColor focus:outline-none"
                  onClick={() => selectOrClose()}
                >
                  {t('join')}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };
  return <>{render()}</>;
};

export default MicrophoneModal;
