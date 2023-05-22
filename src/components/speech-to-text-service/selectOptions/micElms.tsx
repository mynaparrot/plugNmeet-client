import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'lodash';

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
          <option value={mic.deviceId} key={mic.deviceId}>
            {mic.label}
          </option>
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
    <div className="flex items-center justify-between">
      <label
        htmlFor="microphone"
        className="pr-4 w-auto dark:text-darkText text-sm"
      >
        {t('footer.modal.select-microphone')}
      </label>
      <div className="col-span-6 sm:col-span-3">
        <select
          value={selectedMicDevice}
          disabled={disabled}
          onChange={(e) => setSelectedMicDevice(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-transparent dark:border-darkText dark:text-darkText rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {devices}
        </select>
      </div>
    </div>
  );
};

export default MicElms;
