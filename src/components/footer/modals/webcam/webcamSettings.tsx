import React from 'react';
import { useTranslation } from 'react-i18next';
import { isSupported } from '@twilio/video-processors';

import { useAppDispatch } from '../../../../store';
import { updateVirtualBackground } from '../../../../store/slices/bottomIconsActivitySlice';
import { BackgroundConfig } from '../../../../helpers/libs/TrackProcessor';
import WebcamPreview from './webcamPreview';
import BackgroundItems from './backgroundItems';

interface WebcamSettingsProps {
  deviceId: string;
}

const WebcamSettings = ({ deviceId }: WebcamSettingsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const onSelectBg = (bg: BackgroundConfig) => {
    dispatch(updateVirtualBackground(bg));
  };

  return (
    <div className="">
      <div className="w-full overflow-hidden rounded-lg relative bg-black h-64 3xl:h-80">
        <WebcamPreview deviceId={deviceId} />
      </div>
      {isSupported && (
        <>
          <div className="title text-xs md:text-sm leading-none text-Gray-700 dark:text-dark-text px-1 md:px-3 uppercase pt-5 3x:pt-8 pb-5">
            {t('footer.modal.chose-virtual-bg')}
          </div>
          <BackgroundItems onSelect={onSelectBg} />
        </>
      )}
    </div>
  );
};

export default WebcamSettings;
