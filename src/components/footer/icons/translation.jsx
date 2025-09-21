import React from 'react';
import { SpeechIconSVG } from '../../../assets/Icons/SpeechIconSVG';

export const Translation = () => {
  return (
    <div
      className={`translationIcon relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 border-[rgba(124,206,247,0.25)]`}
    >
      <div
        className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950 bg-gray-100`}
      >
        <SpeechIconSVG classes="text-Blue2-950 h-6 w-auto" />
      </div>
    </div>
  );
};
