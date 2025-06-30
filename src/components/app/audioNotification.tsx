import React, { useRef, useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { updatePlayAudioNotification } from '../../store/slices/roomSettingsSlice';

const AudioNotification = () => {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLAudioElement>(null);
  const playAudioNotification = useAppSelector(
    (state) => state.roomSettings.playAudioNotification,
  );
  const allowPlayAudioNotification = useAppSelector(
    (state) => state.roomSettings.allowPlayAudioNotification,
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
    const playing = () => setPlaying(true);
    const ended = () => setPlaying(false);
    if (el) {
      el.addEventListener('playing', playing);
      el.addEventListener('ended', ended);
    }

    return () => {
      if (el) {
        el.pause();
        el.removeEventListener('playing', playing);
        el.removeEventListener('ended', ended);
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
