import { useMemo } from 'react';

interface IUseMainAreaCustomCSS {
  hasScreenShareSubscribers: boolean;
  isActiveWhiteboard: boolean;
  isActiveExternalMediaPlayer: boolean | undefined;
  isActiveDisplayExternalLink: boolean | undefined;
  isRecorder: boolean | undefined;
}

export const useMainAreaCustomCSS = ({
  hasScreenShareSubscribers,
  isActiveWhiteboard,
  isActiveExternalMediaPlayer,
  isActiveDisplayExternalLink,
  isRecorder,
}: IUseMainAreaCustomCSS) => {
  return useMemo(() => {
    const css: Array<string> = [];

    hasScreenShareSubscribers
      ? css.push('showScreenShare fullWidthMainArea')
      : css.push('hideScreenShare');

    isActiveWhiteboard
      ? css.push('showWhiteboard fullWidthMainArea')
      : css.push('hideWhiteboard');

    isActiveExternalMediaPlayer
      ? css.push('showExternalMediaPlayer fullWidthMainArea')
      : css.push('hideExternalMediaPlayer');

    isActiveDisplayExternalLink
      ? css.push('showDisplayExternalLink fullWidthMainArea')
      : css.push('hideDisplayExternalLink');

    if (isRecorder) {
      css.push('isRecorder');
    }

    return css.join(' ');
  }, [
    hasScreenShareSubscribers,
    isActiveWhiteboard,
    isActiveExternalMediaPlayer,
    isActiveDisplayExternalLink,
    isRecorder,
  ]);
};
