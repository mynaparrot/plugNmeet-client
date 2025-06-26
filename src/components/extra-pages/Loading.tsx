import React from 'react';

import './style.css';
import { LoadingIcon } from '../../assets/Icons/Loading';

interface ILoadingProps {
  text: string;
}
const Loading = ({ text }: ILoadingProps) => {
  return (
    <div
      className={`loader opacity-100 fixed top-0 left-0 w-full h-full bg-Gray-100 z-999 flex flex-wrap items-center justify-center`}
      style={{
        backgroundImage: `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="100%25"%3E%3Cpattern id="bg" patternUnits="userSpaceOnUse" width="20" height="20"%3E%3Cg opacity="0.7"%3E%3Crect x="10" y="10" width="4" height="4" rx="2" fill="%23C2DAF2" /%3E%3C/g%3E%3C/pattern%3E%3Crect width="100%25" height="100%25" fill="url(%23bg)" /%3E%3C/svg%3E')`,
      }}
    >
      <div className="inner">
        <div className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 inline-flex items-center capitalize">
          <LoadingIcon
            className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
          {text !== '' ? text : 'loading...'}
        </div>
      </div>
    </div>
  );
};

export default Loading;
