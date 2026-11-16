import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateCanPlaybackAudio } from '../../store/slices/sessionSlice';
import { getMediaServerConnRoom } from '../../helpers/livekit/utils';

/**
 * Browsers block audio autoplay until the user interacts with the page, so we
 * ask for a single click and then resume playback of the room audio.
 */
const AudioPlayModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState(false);
  const canPlaybackAudio = useAppSelector((state) => state.session.canPlaybackAudio);

  const enableAudio = useCallback(async () => {
    setIsBusy(true);
    try {
      await getMediaServerConnRoom().startAudio();
      dispatch(updateCanPlaybackAudio(true));
    } catch (e) {
      console.error('Failed to start audio playback:', e);
    } finally {
      setIsBusy(false);
    }
  }, [dispatch]);

  if (canPlaybackAudio) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-playback-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-Gray-950/70 dark:bg-Gray-950/80"
    >
      <div className="w-full max-w-md rounded-2xl border border-Gray-300 dark:border-Gray-800 bg-Gray-50 dark:bg-dark-primary shadow-virtualPOP px-6 py-6 text-center">
        <h3
          id="audio-playback-title"
          className="text-base md:text-lg font-semibold text-Gray-950 dark:text-white pb-2"
        >
          {t('notifications.audio-playback-title', 'Enable audio')}
        </h3>
        <p className="text-sm 3xl:text-base text-Gray-800 dark:text-white/90 pb-5">
          {t(
            'notifications.audio-playback-desc',
            'Your browser blocked audio playback. Click the button below to hear the meeting.',
          )}
        </p>
        <button
          type="button"
          className="primary-button h-10 w-full cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:bg-Gray-200 disabled:border-Gray-300 disabled:text-Gray-400 disabled:cursor-not-allowed"
          onClick={() => void enableAudio()}
          disabled={isBusy}
        >
          {t('notifications.audio-playback-btn', 'Enable audio')}
        </button>
      </div>
    </div>
  );
};

export default React.memo(AudioPlayModal);
