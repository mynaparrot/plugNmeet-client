import React, { useEffect, useState } from 'react';
import { store } from '../../store';

interface IDurationViewProps {
  duration: number;
}
const DurationView = ({ duration }: IDurationViewProps) => {
  const [remaining, setRemaining] = useState<string>('00:00');

  useEffect(() => {
    const startedAt = store.getState().session.currentRoom.metadata?.started_at;
    const start = startedAt ? startedAt * 1000 : Date.now();
    let diff, minutes, seconds;
    setRemaining('00:00');

    const timer = () => {
      diff = duration * 60 - (((Date.now() - start) / 1000) | 0);

      minutes = (diff / 60) | 0;
      seconds = diff % 60 | 0;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      seconds = seconds < 10 ? '0' + seconds : seconds;

      setRemaining(minutes + ':' + seconds);
      if (diff <= 0) {
        setRemaining('00:00');
      }
    };

    const interval = setInterval(() => {
      timer();
    }, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [duration]);

  return (
    <>
      <div className="timer text-xs md:text-sm border border-solid border-primaryColor dark:border-darkText/80 dark:text-darkText/80 sm:py-[2px] px-3 rounded-lg mt-[2px] mr-[6px]">
        {remaining}
      </div>
    </>
  );
};

export default DurationView;
