import React, { Suspense, useMemo } from 'react';

import { useAppSelector } from '../../../store';
import LazyFeatureFallback from '../lazyFeatureFallback';

const SharedNotepadElement = React.lazy(() => import('../../shared-notepad'));

export const useSharedNotepad = () => {
  const isActiveSharedNotepad = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.isActive,
  );

  return useMemo(() => {
    if (isActiveSharedNotepad) {
      return (
        <Suspense fallback={<LazyFeatureFallback label="footer.modal.shared-notepad" />}>
          <SharedNotepadElement />
        </Suspense>
      );
    }
    return null;
  }, [isActiveSharedNotepad]);
};
