import React from 'react';
import { useTranslation } from 'react-i18next';
import { VideoQuality } from 'livekit-client';

import { useAppDispatch, useAppSelector } from '../../../store';
import {
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
  updateRoomVideoQuality,
} from '../../../store/slices/roomSettingsSlice';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import Dropdown from '../../../helpers/ui/dropdown';

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
        label={t('header.room-settings.show-webcams')}
        enabled={activateWebcamsView}
        onChange={toggleWebcamView}
        customCss="my-4"
      />
      <SettingsSwitch
        label={t('header.room-settings.show-screen-share')}
        enabled={activeScreenSharingView}
        onChange={toggleScreenShareView}
      />
    </div>
  );
};

export default DataSavings;
