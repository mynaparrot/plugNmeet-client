import React from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateTheme } from '../../store/slices/roomSettingsSlice';
import { SunIcon } from '../../assets/Icons/SunIcon';
import { MoonIcon } from '../../assets/Icons/MoonIcon';
import { getConfigValue } from '../../helpers/utils';

const DarkThemeSwitcher = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const dispatch = useAppDispatch();

  const disableDarkMode = getConfigValue<boolean>('disableDarkMode', false, '');
  if (disableDarkMode) {
    updateTheme('light');
    return null;
  }

  const toggleDarkMode = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  return (
    <button onClick={toggleDarkMode}>
      <div className="bg-Gray-200 dark:bg-Gray-700 p-0.5 3xl:p-1 rounded-[14px] overflow-hidden hidden md:flex items-center cursor-pointer transition-all duration-300">
        <div
          className={`item w-7 md:w-8 3xl:w-9 h-7 md:h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center text-[#005580] dark:text-white dark:opacity-30 ${theme === 'light' ? 'bg-white dark:bg-Gray-950' : ''}`}
        >
          <SunIcon />
        </div>
        <div
          className={`item w-7 md:w-8 3xl:w-9 h-7 md:h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center text-[#005580] dark:text-white ${theme === 'dark' ? 'bg-white dark:bg-Gray-950' : ''}`}
        >
          <MoonIcon />
        </div>
      </div>
      <div className="mobile inline md:hidden cursor-pointer">
        {theme === 'dark' ? (
          <div className="moon w-8 h-8 rounded-full flex items-center justify-center">
            <i className="pnm-moon w-4 h-4 text-primaryColor dark:text-white" />
          </div>
        ) : (
          <div className="sun w-8 h-8 rounded-full flex items-center justify-center">
            <i className="pnm-sun w-4 h-4 text-primaryColor dark:text-white" />
          </div>
        )}
      </div>
    </button>
  );
};

export default DarkThemeSwitcher;
