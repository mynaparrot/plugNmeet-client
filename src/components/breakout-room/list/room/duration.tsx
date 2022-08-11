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
      <div className="timer text-xs md:text-sm border border-solid border-primaryColor dark:border-white dark:text-white sm:py-[2px] px-3 rounded-br-lg -mt-[1px] -ml-[1px]">
        {remaining}
      </div>
    </>
  );
};

export default BreakoutRoomDuration;
