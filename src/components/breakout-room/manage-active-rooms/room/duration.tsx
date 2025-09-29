import React, { useMemo } from 'react';

import { useRoomDurationCountdown } from '../../../../helpers/hooks/useRoomDurationCountdown';

interface IDurationProps {
  duration: bigint;
  created: bigint;
}

const BreakoutRoomDuration = ({ duration, created }: IDurationProps) => {
  const endTime = useMemo(() => {
    const startTimeInMs = Number(created) * 1000;
    const durationInMs = Number(duration) * 60 * 1000;
    return startTimeInMs + durationInMs;
  }, [created, duration]);

  const remainingTime = useRoomDurationCountdown(endTime);

  return (
    <div className="h-7 px-4 flex items-center justify-center rounded-xl bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow">
      {remainingTime}
    </div>
  );
};

export default BreakoutRoomDuration;
