import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from '@excalidraw/excalidraw/types';

import { useAppSelector } from '../../../../store';
import { addPreloadedLibraryItems } from '../utils';
import { selectWhiteboardParticipants } from '../../../../store/slices/participantSlice';

interface IUseWhiteboardSetup {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  canEdit: boolean;
}

const useWhiteboardSetup = ({
  excalidrawAPI,
  canEdit,
}: IUseWhiteboardSetup) => {
  const [viewModeEnabled, setViewModeEnabled] = useState(true);
  const collaborators = useRef(new Map<SocketId, Collaborator>());

  const participants = useAppSelector(selectWhiteboardParticipants);
  const mousePointerLocation = useAppSelector(
    (state) => state.whiteboard.mousePointerLocation,
  );
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
      addPreloadedLibraryItems(excalidrawAPI);
    }
  }, [excalidrawAPI, canEdit]);

  // from useCollaborators
  useEffect(() => {
    if (excalidrawAPI && mousePointerLocation) {
      try {
        const data: Collaborator = JSON.parse(mousePointerLocation);
        if (!data.id) {
          return;
        }

        collaborators.current.set(data.id as SocketId, data);
        excalidrawAPI.updateScene({
          collaborators: new Map(collaborators.current),
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [excalidrawAPI, mousePointerLocation]);

  const activeParticipantIds = useMemo(() => {
    // A user's cursor should be removed if:
    // 1. They have disconnected (and are no longer in the participants list).
    // 2. They are no longer a presenter OR their whiteboard is locked.
    const activeUsers = participants.filter(
      (p) => p.isPresent && !p.isWhiteboardLocked,
    );
    return new Set(activeUsers.map((p) => p.userId));
  }, [participants]);

  // for cleaning up collaborators if disconnected
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    const currentSize = collaborators.current.size;
    collaborators.current.forEach((_, userId) => {
      // The `activeParticipantIds` set contains all users who meet the criteria to remain.
      // We remove any collaborator whose userId is not in that active set.
      if (!activeParticipantIds.has(userId)) {
        collaborators.current.delete(userId);
      }
    });

    if (currentSize !== collaborators.current.size) {
      excalidrawAPI.updateScene({
        collaborators: new Map(collaborators.current),
      });
    }
  }, [excalidrawAPI, activeParticipantIds]);

  return { viewModeEnabled };
};

export default useWhiteboardSetup;
