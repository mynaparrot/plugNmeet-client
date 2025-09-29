import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { throttle } from 'es-toolkit/compat';

import { useAppDispatch, useAppSelector } from '../../../store';
import { updateSubtitleFontSize } from '../../../store/slices/speechServicesSlice';
import RangeSlider from '../../../helpers/ui/rangeSlider';

const SubtitleFontSizeSlider = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const subtitleFontSize = useAppSelector(
    (state) => state.speechServices.subtitleFontSize,
  );

  // Local state for the slider to avoid dispatching on every change
  const [localFontSize, setLocalFontSize] = useState<number>(subtitleFontSize);

  // This throttled function ensures we don't dispatch to Redux on every pixel change.
  // It will dispatch at most once every 300ms.
  // oxlint-disable-next-line exhaustive-deps
  const throttledDispatch = useCallback(
    throttle((size: number) => {
      dispatch(updateSubtitleFontSize(size));
    }, 300),
    [],
  );

  const handleOnChange = (size: number) => {
    setLocalFontSize(size);
    throttledDispatch(size);
  };

  return (
    <div className="font-size px-5 pb-6">
      <div className="top flex justify-between items-center mb-3">
        <label
          htmlFor="transcription-size"
          className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right block"
        >
          {t('speech-services.subtitle-font-size')}
        </label>
        <div className="count text-xs text-Gray-800 font-medium bg-Gray-25 border border-Gray-300 shadow-Icon-box rounded-[7px] py-0.5 px-2">
          {localFontSize}
        </div>
      </div>
      <RangeSlider
        min={0}
        max={30}
        value={localFontSize}
        onChange={handleOnChange}
        thumbSize={20}
        trackHeight={8}
      />
    </div>
  );
};

export default SubtitleFontSizeSlider;
