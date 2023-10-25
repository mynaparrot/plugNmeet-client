import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useStorePreviousInt from '../../../helpers/hooks/useStorePreviousInt';
import { useAppDispatch } from '../../../store';
import { updateSubtitleFontSize } from '../../../store/slices/speechServicesSlice';

const SubtitleFontSize = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [fontSize, setFontSize] = useState<number>(14);
  const previousFontSize = useStorePreviousInt(fontSize);

  useEffect(() => {
    if (previousFontSize && fontSize !== previousFontSize) {
      dispatch(updateSubtitleFontSize(fontSize));
    }
  }, [dispatch, fontSize, previousFontSize]);

  return (
    <div className="flex items-center justify-between mt-2">
      <p className="text-sm dark:text-darkText">
        {t('speech-services.subtitle-font-size')}
      </p>
      <section className="flex items-center w-[150px] sm:w-[250px]">
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={fontSize}
          onChange={(event) => {
            setFontSize(event.target.valueAsNumber);
          }}
          className="range flex-1"
        />
        <p className="w-10 text-center text-sm dark:text-white">{fontSize}</p>
      </section>
    </div>
  );
};

export default SubtitleFontSize;
