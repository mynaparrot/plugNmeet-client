import React, { Dispatch, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'es-toolkit/compat';

import { getInputMediaDevices } from '../../../helpers/utils';
import { IMediaDevice } from '../../../store/slices/interfaces/roomSettings';
import Dropdown from '../../../helpers/ui/dropdown';

interface IMicSelectorProps {
  disabled: boolean;
  selectedMicDevice: string;
  setSelectedMicDevice: Dispatch<string>;
}

const MicSelector = ({
  disabled,
  selectedMicDevice,
  setSelectedMicDevice,
}: IMicSelectorProps) => {
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

  const micOptions = useMemo(() => {
    return devices.map((d) => ({
      value: d.id,
      text: d.label,
    }));
  }, [devices]);

  return (
    devices.length && (
      <div className="selectMicroPhone">
        <Dropdown
          id="microphone"
          label={t('footer.modal.select-microphone')}
          value={selectedMicDevice}
          onChange={setSelectedMicDevice}
          disabled={disabled}
          options={micOptions}
          direction="vertical"
        />
      </div>
    )
  );
};

export default MicSelector;
