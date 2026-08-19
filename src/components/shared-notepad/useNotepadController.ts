import { useEffect } from 'react';

import { useAppSelector } from '../../store';
import { getNotepadController } from './NotepadController';

export const useNotepadController = () => {
  const features = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures,
  );

  useEffect(() => {
    void getNotepadController().sync();
  }, [features?.isActive, features?.isAllow]);
};
