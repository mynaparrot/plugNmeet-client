import React, { useEffect, useMemo } from 'react';
import { throttle } from 'es-toolkit';

import { useAppSelector } from '../../../../store';

interface IInterimTextDisplayProps {
  scrollToBottom: () => void;
}

const InterimTextDisplay = ({ scrollToBottom }: IInterimTextDisplayProps) => {
  const interimText = useAppSelector(
    (state) => state.speechServices.interimText,
  );

  const throttledScroll = useMemo(
    () =>
      throttle(scrollToBottom, 200, {
        edges: ['trailing'],
      }),
    [scrollToBottom],
  );

  useEffect(() => {
    throttledScroll();
  }, [interimText, throttledScroll]);

  return (
    interimText && (
      <div className="sentence w-full text-sm text-white">
        <p className="flex justify-between items-end pb-1 font-medium capitalize">
          <span>{interimText.from}</span>
          <span className="font-normal">{interimText.time}</span>
        </p>
        <p className="message-content w-full p-2 border border-white/10 bg-white/10 rounded-[15px] rounded-tl-none">
          {interimText.text}
        </p>
      </div>
    )
  );
};

export default InterimTextDisplay;
