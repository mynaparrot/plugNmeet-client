import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VideoQuality } from 'livekit-client';

import { useAppDispatch, useAppSelector } from '../../../store';
import {
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
  updateMaxNumDisplayWebcams,
  updateRoomVideoQuality,
} from '../../../store/slices/roomSettingsSlice';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';
import { UserDeviceType } from '../../../store/slices/interfaces/session';

const DataSavings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const videoQuality = useAppSelector(
    (state) => state.roomSettings.roomVideoQuality,
  );
  const activateWebcamsView = useAppSelector(
    (state) => state.roomSettings.activateWebcamsView,
  );
  const activeScreenSharingView = useAppSelector(
    (state) => state.roomSettings.activeScreenSharingView,
  );
  const userDeviceType = useAppSelector(
    (state) => state.session.userDeviceType,
  );
  const maxNumDisplayWebcams = useAppSelector(
    (state) => state.roomSettings.maxNumDisplayWebcams,
  );
  const [numWebcamsOpts, setNumWebcamsOpts] = useState<ISelectOption[]>([]);

  useEffect(() => {
    let opts: ISelectOption[] = [
      { text: '4', value: 4 },
      { text: '6', value: 6 },
    ];

    if (userDeviceType === UserDeviceType.TABLET) {
      opts = [{ text: '9', value: 9 }];
    } else if (userDeviceType === UserDeviceType.DESKTOP) {
      opts.push(
        { text: '9', value: 9 },
        { text: '12', value: 12 },
        { text: '16', value: 16 },
        { text: '24', value: 24 },
      );
    }

    setNumWebcamsOpts(opts);
  }, [userDeviceType]);

  const toggleWebcamView = () => {
    dispatch(updateActivateWebcamsView(!activateWebcamsView));
  };

  const toggleScreenShareView = () => {
    dispatch(updateActiveScreenSharingView(!activeScreenSharingView));
  };

  const getVideoQualityText = (quality: VideoQuality) => {
    switch (quality) {
      case VideoQuality.LOW:
        return t('header.room-settings.low');
      case VideoQuality.MEDIUM:
        return t('header.room-settings.medium');
      case VideoQuality.HIGH:
        return t('header.room-settings.high');
      default:
        return '';
    }
  };

  return (
    <div className="mt-2">
      <Dropdown
        label={t('header.room-settings.video-quality')}
        id="video-quality"
        value={videoQuality}
        onChange={(v) => dispatch(updateRoomVideoQuality(v as VideoQuality))}
        options={Object.values(VideoQuality)
          .filter((q) => typeof q === 'number')
          .map((q) => {
            return {
              value: q,
              text: getVideoQualityText(q as VideoQuality),
            };
          })}
        direction="horizontal"
      />

      <SettingsSwitch
        label={t('header.room-settings.show-screen-share')}
        enabled={activeScreenSharingView}
        onChange={toggleScreenShareView}
        customCss="my-4"
      />

      <SettingsSwitch
        label={t('header.room-settings.show-webcams')}
        enabled={activateWebcamsView}
        onChange={toggleWebcamView}
        customCss="my-4"
      />
      {activateWebcamsView && (
        <Dropdown
          label={t('header.room-settings.max-num-webcam')}
          id="max-num-webcam"
          value={maxNumDisplayWebcams || 24}
          onChange={(v) => dispatch(updateMaxNumDisplayWebcams(v))}
          options={numWebcamsOpts}
          direction="horizontal"
        />
      )}
    </div>
  );
};

export default DataSavings;
