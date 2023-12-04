import React, { useRef, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { updatePlayAudioNotification } from '../../store/slices/roomSettingsSlice';

const playAudioNotificationSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.playAudioNotification,
);

const allowPlayAudioNotificationSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.allowPlayAudioNotification,
);

const AudioNotification = () => {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLAudioElement>(null);
  const playAudioNotification = useAppSelector(playAudioNotificationSelector);
  const allowPlayAudioNotification = useAppSelector(
    allowPlayAudioNotificationSelector,
  );
  const [playing, setPlaying] = useState(false);
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  useEffect(() => {
    const el = ref.current;
    // we'll play only if audio notification is enabled
    if (playAudioNotification) {
      if (!playing && allowPlayAudioNotification) {
        el?.play();
      }
      dispatch(updatePlayAudioNotification(false));
    }
  }, [playAudioNotification, playing, allowPlayAudioNotification, dispatch]);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.addEventListener('playing', () => setPlaying(true));
      el.addEventListener('ended', () => setPlaying(false));
    }

    return () => {
      if (el) {
        el.pause();
        el.removeEventListener('playing', () => setPlaying(true));
        el.removeEventListener('ended', () => setPlaying(false));
      }
    };
  }, []);

  return (
    <div style={{ display: 'none' }}>
      <audio ref={ref} src={`${assetPath}/audio/notification.mp3`} />
    </div>
  );
};

export default React.memo(AudioNotification);
