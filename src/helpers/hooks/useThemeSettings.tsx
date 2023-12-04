import { useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { updateTheme } from '../../store/slices/roomSettingsSlice';

const themeSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.theme,
);

const useThemeSettings = () => {
  const theme = useAppSelector(themeSelector);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const changeTheme = (event) => {
      dispatch(updateTheme(event.matches ? 'dark' : 'light'));
    };
    // change according to system
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      dispatch(updateTheme('dark'));
    }

    // keep watching
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', changeTheme);
    return () => {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeEventListener('change', changeTheme);
    };
  }, [dispatch]);

  useEffect(() => {
    if (theme === 'dark') {
      document.querySelector('body')?.classList.add('dark');
    } else {
      document.querySelector('body')?.classList.remove('dark');
    }
  }, [theme]);
};

export default useThemeSettings;
