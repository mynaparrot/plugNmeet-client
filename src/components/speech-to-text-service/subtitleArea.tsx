import React, { useMemo, useState } from 'react';
import { useAppSelector } from '../../store';
import { speechServicesSelector } from '../../store/slices/speechServicesSlice';
import useStorePreviousString from '../../helpers/hooks/useStorePreviousString';

interface SubtitleAreaProps {
  lang: string;
}
const SubtitleArea = ({ lang }: SubtitleAreaProps) => {
  const final = useAppSelector((state) =>
    speechServicesSelector.selectById(state, lang + '_final'),
  );
  const interim = useAppSelector((state) =>
    speechServicesSelector.selectById(state, lang + '_interim'),
  );
  const lastFinalText = useStorePreviousString(final?.text ?? '');

  const getSubtitleText = useMemo(() => {
    const text: string[] = [];
    if (lastFinalText) {
      text.push(lastFinalText);
    }
    if (final) {
      text.push(final.text);
    }
    if (interim) {
      text.push(interim.text);
    }

    return text.join(' ');
  }, [final, interim, lastFinalText]);

  return <div>{getSubtitleText}</div>;
};

export default SubtitleArea;
