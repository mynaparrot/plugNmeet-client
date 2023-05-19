import React, { useEffect, useMemo, useState } from 'react';

import { useAppSelector } from '../../store';
import { speechServicesSelector } from '../../store/slices/speechServicesSlice';

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
  const [finalTexts, setFinalTexts] = useState<object>({ 0: '', 1: '' });
  const [subtitleText, setSubtitleText] = useState<string | undefined>(
    undefined,
  );

  useMemo(() => {
    if (final) {
      setFinalTexts((prevState) => ({
        ...prevState,
        [0]: prevState[1],
        [1]: final.text,
      }));
    }
  }, [final]);

  useEffect(() => {
    const text: string[] = [finalTexts[0], finalTexts[1]];

    if (interim) {
      text.push(interim.text);
    }

    setSubtitleText(text.join(' '));

    const clear = setTimeout(() => {
      setSubtitleText(undefined);
    }, 10000);

    return () => {
      clearTimeout(clear);
    };
  }, [finalTexts, interim]);

  return (
    <>
      {subtitleText && (
        <div className="sub-title w-max absolute bottom-4 py-1 px-2 bg-black/20 text-black dark:text-white m-auto inline-block left-1/2 -translate-x-1/2 text-sm pointer-events-none">
          {subtitleText}
        </div>
      )}
    </>
  );
};

export default SubtitleArea;
