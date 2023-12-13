import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { updateTheme } from '../../store/slices/roomSettingsSlice';

const themeSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.theme,
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
              <i className="pnm-moon w-4 h-4 text-primaryColor dark:text-secondaryColor" />
            </div>
          ) : (
            <div className="sun w-8 h-8 rounded-full flex items-center justify-center">
              <i className="pnm-sun w-4 h-4 text-primaryColor dark:text-secondaryColor" />
            </div>
          )}
        </>
      </button>
    </div>
  );
};

export default DarkThemeSwitcher;
