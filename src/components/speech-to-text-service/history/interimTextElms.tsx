import React, { useEffect, useRef } from 'react';

import { useAppSelector } from '../../../store';

const InterimTextElms = () => {
  const interimText = useAppSelector(
    (state) => state.speechServices.interimText,
  );
  const scrollToRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (scrollToRef.current) {
        scrollToRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest',
        });
      }
    }, 500);
    return () => {
      clearTimeout(timeout);
    };
  }, [interimText]);

  return (
    <>
      {interimText ? (
        <div className="sentence w-full text-sm text-white">
          <p className="flex justify-between items-end pb-1 font-medium capitalize">
            <span>{interimText.from}</span>
            <span className="font-normal">{interimText.time}</span>
          </p>
          <p className="message-content w-full p-2 border border-white/10 bg-white/10 rounded-[15px] rounded-tl-none">
            {interimText.text}
          </p>
        </div>
      ) : null}
      <div className="empty:hidden" ref={scrollToRef} />
    </>
  );
};

export default InterimTextElms;
