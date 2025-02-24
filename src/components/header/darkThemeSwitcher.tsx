import React from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateTheme } from '../../store/slices/roomSettingsSlice';
import { SunIcon } from '../../assets/Icons/SunIcon';
import { MoonIcon } from '../../assets/Icons/MoonIcon';

const DarkThemeSwitcher = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const dispatch = useAppDispatch();

  const toggleDarkMode = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="dark-mode">
      <button onClick={toggleDarkMode}>
        <>
          <div className="bg-Gray-200 p-1 rounded-[14px] overflow-hidden flex items-center">
            <div
              className={`item w-8 3xl:w-9 h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center ${theme === 'light' ? 'bg-white' : ''}`}
            >
              <SunIcon />
            </div>
            <div
              className={`item w-8 3xl:w-9 h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center ${theme === 'dark' ? 'bg-white' : ''}`}
            >
              <MoonIcon />
            </div>
          </div>
          {/* {theme === 'dark' ? (
            <div className="moon w-8 h-8 rounded-full flex items-center justify-center">
              <i className="pnm-moon w-4 h-4 text-primaryColor dark:text-secondaryColor" />
            </div>
          ) : (
            <div className="sun w-8 h-8 rounded-full flex items-center justify-center">
              <i className="pnm-sun w-4 h-4 text-primaryColor dark:text-secondaryColor" />
            </div>
          )} */}
        </>
      </button>
    </div>
  );
};

export default DarkThemeSwitcher;
