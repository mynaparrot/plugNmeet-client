import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateTheme } from '../../store/slices/roomSettingsSlice';

const useThemeSettings = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);
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
