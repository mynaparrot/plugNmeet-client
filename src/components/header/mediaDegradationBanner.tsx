import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../store';
import { getMediaServerConn } from '../../helpers/livekit/utils';

const MediaDegradationBanner = () => {
  const { t } = useTranslation();
  const mediaDegradation = useAppSelector(
    (state) => state.roomSettings.mediaDegradation,
  );

  const degraded =
    mediaDegradation.incomingWebcamPaused ||
    mediaDegradation.incomingScreensharePaused ||
    mediaDegradation.outgoingCameraPaused;

  if (!degraded) return null;

  const message = mediaDegradation.autoRestoreSuspended
    ? t('header.connection-status.video-stays-paused-banner')
    : t('header.connection-status.video-paused-banner');

  return (
    <div
      aria-live="polite"
      className="flex items-center justify-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs sm:text-sm"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => getMediaServerConn().adaptiveMedia?.resumeAll()}
        className="shrink-0 px-3 py-1 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
      >
        {t('header.connection-status.re-enable-video')}
      </button>
    </div>
  );
};

export default MediaDegradationBanner;
