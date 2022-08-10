import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { updateTheme } from '../../store/slices/roomSettingsSlice';

const themeSelector = createSelector(
  (state: RootState) => state.roomSettings.theme,
  (theme) => theme,
);

const DarkThemeSwitcher = () => {
  const theme = useAppSelector(themeSelector);
  const dispatch = useAppDispatch();

  const toggleDarkMode = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="dark-mode mt-1">
      <button onClick={toggleDarkMode}>
        <>
          {theme === 'dark' ? (
            <div className="moon w-8 h-8 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primaryColor dark:text-secondaryColor"
                xmlns="http://www.w3.org/2000/svg"
                x="0px"
                y="0px"
                viewBox="0 0 455 455"
              >
                <polygon
                  points="320.18,162.705 280.63,171.052 307.72,201.052 303.437,241.245 340.34,224.751 377.243,241.245 372.96,201.052 
                        400.05,171.052 360.5,162.705 340.34,127.67"
                  fill="currentColor"
                />
                <polygon
                  points="440,325.677 414.091,320.208 400.883,297.253 387.675,320.208 361.766,325.677 379.513,345.33 376.708,371.661 
                        400.884,360.855 425.063,371.661 422.254,345.329"
                  fill="currentColor"
                />
                <path
                  d="M218,227.5c0-89.167,51.306-166.338,126-203.64C313.443,8.6,278.978,0,242.5,0C116.855,0,15,101.855,15,227.5
                        S116.855,455,242.5,455c36.478,0,70.943-8.6,101.5-23.86C269.306,393.838,218,316.667,218,227.5z"
                  fill="currentColor"
                />
              </svg>
            </div>
          ) : (
            <div className="sun w-8 h-8 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primaryColor dark:text-secondaryColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
              >
                <path
                  fill="currentColor"
                  d="m256,105.5c-83.9,0-152.2,68.3-152.2,152.2 0,83.9 68.3,152.2 152.2,152.2 83.9,0 152.2-68.3 152.2-152.2 0-84-68.3-152.2-152.2-152.2zm0,263.5c-61.4,0-111.4-50-111.4-111.4 0-61.4 50-111.4 111.4-111.4 61.4,0 111.4,50 111.4,111.4 0,61.4-50,111.4-111.4,111.4z"
                />
                <path
                  fill="currentColor"
                  d="m256,74.8c11.3,0 20.4-9.1 20.4-20.4v-23c0-11.3-9.1-20.4-20.4-20.4-11.3,0-20.4,9.1-20.4,20.4v23c2.84217e-14,11.3 9.1,20.4 20.4,20.4z"
                />
                <path
                  fill="currentColor"
                  d="m256,437.2c-11.3,0-20.4,9.1-20.4,20.4v22.9c0,11.3 9.1,20.4 20.4,20.4 11.3,0 20.4-9.1 20.4-20.4v-22.9c0-11.2-9.1-20.4-20.4-20.4z"
                />
                <path
                  fill="currentColor"
                  d="m480.6,235.6h-23c-11.3,0-20.4,9.1-20.4,20.4 0,11.3 9.1,20.4 20.4,20.4h23c11.3,0 20.4-9.1 20.4-20.4 0-11.3-9.1-20.4-20.4-20.4z"
                />
                <path
                  fill="currentColor"
                  d="m54.4,235.6h-23c-11.3,0-20.4,9.1-20.4,20.4 0,11.3 9.1,20.4 20.4,20.4h22.9c11.3,0 20.4-9.1 20.4-20.4 0.1-11.3-9.1-20.4-20.3-20.4z"
                />
                <path
                  fill="currentColor"
                  d="M400.4,82.8L384.1,99c-8,8-8,20.9,0,28.9s20.9,8,28.9,0l16.2-16.2c8-8,8-20.9,0-28.9S408.3,74.8,400.4,82.8z"
                />
                <path
                  fill="currentColor"
                  d="m99,384.1l-16.2,16.2c-8,8-8,20.9 0,28.9 8,8 20.9,8 28.9,0l16.2-16.2c8-8 8-20.9 0-28.9s-20.9-7.9-28.9,0z"
                />
                <path
                  fill="currentColor"
                  d="m413,384.1c-8-8-20.9-8-28.9,0-8,8-8,20.9 0,28.9l16.2,16.2c8,8 20.9,8 28.9,0 8-8 8-20.9 0-28.9l-16.2-16.2z"
                />
                <path
                  fill="currentColor"
                  d="m99,127.9c8,8 20.9,8 28.9,0 8-8 8-20.9 0-28.9l-16.2-16.2c-8-8-20.9-8-28.9,0-8,8-8,20.9 0,28.9l16.2,16.2z"
                />
              </svg>
            </div>
          )}
        </>
      </button>
    </div>
  );
};

export default DarkThemeSwitcher;
