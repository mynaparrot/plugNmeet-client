import { useEffect, useMemo, useState } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { useAppSelector } from '../../../../store';
import { addPreloadedLibraryItems } from '../utils';
import { selectWhiteboardParticipants } from '../../../../store/slices/participantSlice';
import { getWhiteboardController } from '../../collab';

interface IUseWhiteboardSetup {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  canEdit: boolean;
}

const useWhiteboardSetup = ({
  excalidrawAPI,
  canEdit,
}: IUseWhiteboardSetup) => {
  const [viewModeEnabled, setViewModeEnabled] = useState(true);

  const participants = useAppSelector(selectWhiteboardParticipants);
  const refreshWhiteboardSignal = useAppSelector(
    (state) => state.whiteboard.refreshWhiteboardSignal,
  );

  useEffect(() => {
    if (excalidrawAPI && refreshWhiteboardSignal > 0) {
      excalidrawAPI.refresh();
    }
  }, [refreshWhiteboardSignal, excalidrawAPI]);

  useEffect(() => {
    if (!excalidrawAPI) {
      // Before the API is ready, set view mode based on default lock for non-recorders.
      return;
    }

    // The view mode is simply the inverse of canEdit.
    setViewModeEnabled(!canEdit);

    if (canEdit) {
      void addPreloadedLibraryItems(excalidrawAPI);
    }
  }, [excalidrawAPI, canEdit]);

  const activeParticipantIds = useMemo(() => {
    // A user's cursor should be removed if:
    // 1. They have disconnected (and are no longer in the participants list).
    // 2. They are no longer a presenter OR their whiteboard is locked.
    const activeUsers = participants.filter(
      (p) => p.isPresent || !p.isWhiteboardLocked,
    );
    return new Set(activeUsers.map((p) => p.userId));
  }, [participants]);

  // Refresh the rendered collaborator cursors whenever the active participant
  // set changes (e.g. a participant leaves or their whiteboard lock flips).
  // Presence itself is owned by the controller's room-scoped Awareness.
  useEffect(() => {
    if (excalidrawAPI) {
      getWhiteboardController().refreshCollaborators();
    }
  }, [excalidrawAPI, activeParticipantIds]);

  return { viewModeEnabled };
};

export default useWhiteboardSetup;
