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
        <div className="sentence w-full pt-2">
          <p className="date text-sm pb-1 primaryColor dark:text-dark-text">
            <span className="text-xs">{interimText.time}</span>{' '}
            {interimText.from}:
          </p>
          <p className="message-content max-w-fit shadow-footer text-sm bg-secondary-color text-white py-1 px-2 rounded-sm">
            {interimText.text}
          </p>
        </div>
      ) : null}
      <div className="pt-[5px]" ref={scrollToRef} />
    </>
  );
};

export default InterimTextElms;
