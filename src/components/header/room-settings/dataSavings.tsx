import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VideoQuality } from 'livekit-client';

import { useAppDispatch, useAppSelector } from '../../../store';
import {
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
  updateMaxNumDisplayWebcams,
  updateRoomVideoQuality,
  updateSelectedScreenShareResolution,
} from '../../../store/slices/roomSettingsSlice';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';
import { UserDeviceType } from '../../../store/slices/interfaces/session';
import { IMaxNumDisplayWebcams } from '../../../store/slices/interfaces/roomSettings';
import { getMediaServerConn } from '../../../helpers/livekit/utils';
import {
  getConfigValue,
  SCREENSHARE_RESOLUTION_KEYS,
  getScreenShareResolutionName,
  getCappedResolutions,
} from '../../../helpers/utils';

const DataSavings = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const videoQuality = useAppSelector((state) => state.roomSettings.roomVideoQuality);
  const selectedScreenShareResolution = useAppSelector(
    (state) => state.roomSettings.selectedScreenShareResolution,
  );
  const activateWebcamsView = useAppSelector((state) => state.roomSettings.activateWebcamsView);
  const activeScreenSharingView = useAppSelector(
    (state) => state.roomSettings.activeScreenSharingView,
  );
  const userDeviceType = useAppSelector((state) => state.session.userDeviceType);
  const maxNumDisplayWebcams = useAppSelector((state) => state.roomSettings.maxNumDisplayWebcams);
  const [numWebcamsOpts, setNumWebcamsOpts] = useState<ISelectOption[]>([]);

  useEffect(() => {
    const configMaxNumWebcams = getConfigValue<IMaxNumDisplayWebcams>('maxNumDisplayWebcams');

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

    const filteredOpts = allOpts.filter((opt) => (opt.value as number) <= configMax);

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

  const handleOnChangeVideoQuality = useCallback(
    (quality: VideoQuality) => {
      // Dispatch first so the store holds the chosen value and the controller
      // can read it: a same-value choice (re-selecting LOW) leaves the Redux
      // value unchanged, so the subscription cannot observe it and a stale
      // auto-lowered value would otherwise be restored later over the choice.
      dispatch(updateRoomVideoQuality(quality));

      try {
        getMediaServerConn().adaptiveMedia?.notifyUserQualitySelection();
      } catch {
        // media connection not created yet: nothing owns a reduction to relinquish
      }
    },
    [dispatch],
  );

  const screenShareResolutionOptions = useMemo(
    () =>
      getCappedResolutions(
        SCREENSHARE_RESOLUTION_KEYS,
        getConfigValue<string>('defaultScreenShareResolution', 'h1080fps15'),
      ).map((key) => ({
        value: key,
        text: t(`footer.modal.screenshare-resolution.${key}`),
      })),
    [t],
  );

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
    <div className="mt-2 pb-10">
      <Dropdown
        label={t('header.room-settings.video-quality')}
        id="video-quality"
        value={videoQuality}
        onChange={handleOnChangeVideoQuality}
        options={Object.values(VideoQuality)
          .filter((q) => typeof q === 'number')
          .map((q) => {
            return {
              value: q,
              text: getVideoQualityText(q as VideoQuality),
            };
          })}
        direction="horizontal"
        helpText={t('header.room-settings.video-quality-help')}
      />

      <Dropdown
        label={t('header.room-settings.screen-share-quality')}
        id="screen-share-quality"
        value={selectedScreenShareResolution || getScreenShareResolutionName()}
        onChange={(v) => dispatch(updateSelectedScreenShareResolution(v))}
        options={screenShareResolutionOptions}
        direction="horizontal"
        helpText={t('header.room-settings.screen-share-quality-help')}
      />

      <SettingsSwitch
        label={t('header.room-settings.show-screen-share')}
        enabled={activeScreenSharingView}
        onChange={toggleScreenShareView}
        helpText={t('header.room-settings.show-screen-share-help')}
        customCss="my-4"
      />

      <SettingsSwitch
        label={t('header.room-settings.show-webcams')}
        enabled={activateWebcamsView}
        onChange={toggleWebcamView}
        helpText={t('header.room-settings.show-webcams-help')}
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
          helpText={t('header.room-settings.max-num-webcam-help')}
        />
      )}
    </div>
  );
};

export default DataSavings;
