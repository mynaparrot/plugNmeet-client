import React, { useEffect, useState } from 'react';

interface IDurationProps {
  duration: bigint;
  created: bigint;
}
const BreakoutRoomDuration = ({ duration, created }: IDurationProps) => {
  const [remaining, setRemaining] = useState<string>('00:00');

  useEffect(() => {
    const start = Number(created) * 1000;
    let diff, minutes, seconds;

    const timer = () => {
      diff = Number(duration) * 60 - (((Date.now() - start) / 1000) | 0);

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
  }, [duration, created]);

  return (
    <>
      <div className="h-7 px-4 flex items-center justify-center rounded-xl bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow">
        {remaining}
      </div>
    </>
  );
};

export default BreakoutRoomDuration;
