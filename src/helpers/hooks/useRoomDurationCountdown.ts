import { useEffect, useState } from 'react';

const calculateRemainingTime = (endTime: number) => {
  const now = Date.now();
  const remaining = Math.max(0, endTime - now); // Ensure time doesn't go below zero

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Pad with leading zeros
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
};

export const useRoomDurationCountdown = (endTime: number) => {
  const [remainingTime, setRemainingTime] = useState(() =>
    calculateRemainingTime(endTime),
  );

  useEffect(() => {
    // Don't start the timer if the end time has already passed
    if (endTime < Date.now()) {
      setRemainingTime('00:00');
      return;
    }

    const interval = setInterval(() => {
      const newRemainingTime = calculateRemainingTime(endTime);
      setRemainingTime(newRemainingTime);

      if (newRemainingTime === '00:00') {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return remainingTime;
};
