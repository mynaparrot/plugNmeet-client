import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { IMaxNumDisplayWebcams } from '../../../store/slices/interfaces/roomSettings';
import { getConfigValue } from '../../../helpers/utils';

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
    const configMaxNumWebcams = getConfigValue<IMaxNumDisplayWebcams>(
      'max_num_display_webcams',
    );

    let allOpts: ISelectOption[];
    let configMax: number;

    switch (userDeviceType) {
      case UserDeviceType.MOBILE:
        allOpts = [
          { text: '4', value: 4 },
          { text: '6', value: 6 },
        ];
        configMax = configMaxNumWebcams?.mobile ?? 6;
        break;
      case UserDeviceType.TABLET:
        allOpts = [
          { text: '4', value: 4 },
          { text: '6', value: 6 },
          { text: '9', value: 9 },
        ];
        configMax = configMaxNumWebcams?.tablet ?? 9;
        break;
      case UserDeviceType.DESKTOP:
      default:
        allOpts = [
          { text: '4', value: 4 },
          { text: '6', value: 6 },
          { text: '9', value: 9 },
          { text: '12', value: 12 },
          { text: '16', value: 16 },
          { text: '24', value: 24 },
        ];
        configMax = configMaxNumWebcams?.desktop ?? 24;
        break;
    }

    const filteredOpts = allOpts.filter(
      (opt) => (opt.value as number) <= configMax,
    );

    if (configMax && !filteredOpts.find((o) => o.value === configMax)) {
      filteredOpts.push({
        text: String(configMax),
        value: configMax,
      });
      filteredOpts.sort((a, b) => (a.value as number) - (b.value as number));
    }

    setNumWebcamsOpts(filteredOpts);
  }, [userDeviceType]);

  const handleOnChangeNumWebcams = useCallback(
    (v: number) => {
      const newMaxNum = { ...maxNumDisplayWebcams };
      switch (userDeviceType) {
        case UserDeviceType.MOBILE:
          newMaxNum.mobile = v;
          break;
        case UserDeviceType.TABLET:
          newMaxNum.tablet = v;
          break;
        case UserDeviceType.DESKTOP:
        default:
          newMaxNum.desktop = v;
          break;
      }
      dispatch(updateMaxNumDisplayWebcams(newMaxNum));
    },
    [dispatch, maxNumDisplayWebcams, userDeviceType],
  );

  const currentMaxValue = useMemo(() => {
    switch (userDeviceType) {
      case UserDeviceType.MOBILE:
        return maxNumDisplayWebcams.mobile;
      case UserDeviceType.TABLET:
        return maxNumDisplayWebcams.tablet;
      case UserDeviceType.DESKTOP:
      default:
        return maxNumDisplayWebcams.desktop;
    }
  }, [userDeviceType, maxNumDisplayWebcams]);

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
          value={currentMaxValue}
          onChange={handleOnChangeNumWebcams}
          options={numWebcamsOpts}
          direction="horizontal"
        />
      )}
    </div>
  );
};

export default DataSavings;
