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
    <div className="dark-mode hidden md:inline">
      <button onClick={toggleDarkMode}>
        <div className="bg-Gray-200 dark:bg-Gray-700 p-0.5 3xl:p-1 rounded-[14px] overflow-hidden flex items-center cursor-pointer transition-all duration-300">
          <div
            className={`item w-8 3xl:w-9 h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center text-[#005580] dark:text-white dark:opacity-30 ${theme === 'light' ? 'bg-white dark:bg-Gray-950' : ''}`}
          >
            <SunIcon />
          </div>
          <div
            className={`item w-8 3xl:w-9 h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center text-[#005580] dark:text-white ${theme === 'dark' ? 'bg-white dark:bg-Gray-950' : ''}`}
          >
            <MoonIcon />
          </div>
        </div>
      </button>
    </div>
  );
};

export default DarkThemeSwitcher;
