import React from 'react';

import './style.scss';
import { LoadingIcon } from '../../assets/Icons/Loading';

interface ILoadingProps {
  text: string;
}
const Loading = ({ text }: ILoadingProps) => {
  return (
    <div
      className={`loader opacity-1 fixed top-0 left-0 w-full h-full bg-white/90 dark:bg-darkPrimary/90 z-[999] flex flex-wrap items-center justify-center`}
    >
      <div className="inner">
        <div className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 inline-flex items-center">
          <LoadingIcon
            className={
              'inline w-10 h-10 me-3 text-gray-200 animate-spin dark:text-gray-600'
            }
            fillColor={'#004D90'}
          />
          {text !== '' ? text : 'loading...'}
        </div>
      </div>
    </div>
  );
};

export default Loading;
