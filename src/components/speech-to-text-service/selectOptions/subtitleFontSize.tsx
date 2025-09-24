import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useStorePreviousInt from '../../../helpers/hooks/useStorePreviousInt';
import { store, useAppDispatch } from '../../../store';
import { updateSubtitleFontSize } from '../../../store/slices/speechServicesSlice';
import RangeSlider from '../../../helpers/libs/rangeSlider';

const SubtitleFontSize = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [fontSize, setFontSize] = useState<number>(
    store.getState().speechServices.subtitleFontSize,
  );
  const previousFontSize = useStorePreviousInt(fontSize);

  useEffect(() => {
    if (previousFontSize && fontSize !== previousFontSize) {
      dispatch(updateSubtitleFontSize(fontSize));
    }
  }, [dispatch, fontSize, previousFontSize]);

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
          {fontSize}
        </div>
      </div>
      <RangeSlider
        min={0}
        max={30}
        value={fontSize}
        onChange={setFontSize}
        thumbSize={20}
        trackHeight={8}
      />
    </div>
  );
};

export default SubtitleFontSize;
