import React, { useEffect, useRef } from 'react';

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
  const assetPath = (window as any).STATIC_ASSETS_PATH ?? './assets';

  useEffect(() => {
    const el = ref.current;
    if (playAudioNotification && allowPlayAudioNotification && el?.paused) {
      el.play().catch((e) => {
        // Autoplay was prevented.
        console.error('Error playing notification sound:', e);
      });
      // Reset the trigger immediately after attempting to play.
      dispatch(updatePlayAudioNotification(false));
    } else if (playAudioNotification) {
      // If we received a request but didn't play, we still need to reset the trigger.
      dispatch(updatePlayAudioNotification(false));
    }
  }, [playAudioNotification, allowPlayAudioNotification, dispatch]);

  return (
    <div style={{ display: 'none' }}>
      <audio ref={ref} src={`${assetPath}/audio/notification.mp3`} />
    </div>
  );
};

export default React.memo(AudioNotification);
