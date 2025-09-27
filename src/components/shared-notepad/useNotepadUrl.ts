import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../store';

const getUserColor = () => {
  let userColor = sessionStorage.getItem('shared-notepad-user-color');
  if (!userColor) {
    userColor = ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0');
    sessionStorage.setItem('shared-notepad-user-color', userColor);
  }
  return userColor;
};

export const useNotepadUrl = () => {
  const { i18n } = useTranslation();
  const sharedNotepadFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures,
  );
  const lockSharedNotepad = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockSharedNotepad,
  );
  const theme = useAppSelector((state) => state.roomSettings.theme);
  const currentUser = useAppSelector((state) => state.session.currentUser);

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sharedNotepadFeatures?.isActive || !sharedNotepadFeatures.host) {
      setUrl(null);
      return;
    }

    let baseUrl = sharedNotepadFeatures.host;
    if (baseUrl.match('host.docker.internal')) {
      baseUrl = 'http://localhost:9001';
    }

    let padId = sharedNotepadFeatures.notePadId;
    if (currentUser?.isRecorder || lockSharedNotepad) {
      padId = sharedNotepadFeatures.readOnlyPadId;
    }

    const themeParam = theme === 'dark' ? 'monokai' : 'normal';

    const fullUrl = `${baseUrl}/p/${padId}?userName=${
      currentUser?.name
    }&userColor=%23${getUserColor()}&lang=${
      i18n.languages[0]
    }&theme=${themeParam}`;

    setUrl(fullUrl);
  }, [
    sharedNotepadFeatures,
    lockSharedNotepad,
    theme,
    i18n.languages,
    currentUser,
  ]);

  return url;
};
