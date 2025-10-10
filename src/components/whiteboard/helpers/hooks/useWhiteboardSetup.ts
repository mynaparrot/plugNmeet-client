import { useEffect, useRef, useState } from 'react';
import {
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from '@excalidraw/excalidraw/types';

import { useAppSelector } from '../../../../store';
import { addPreloadedLibraryItems } from '../utils';
import { selectBasicParticipants } from '../../../../store/slices/participantSlice';

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

  const participants = useAppSelector(selectBasicParticipants);
  const mousePointerLocation = useAppSelector(
    (state) => state.whiteboard.mousePointerLocation,
  );
  const refreshWhiteboard = useAppSelector(
    (state) => state.whiteboard.refreshWhiteboard,
  );

  useEffect(() => {
    if (excalidrawAPI && refreshWhiteboard) {
      excalidrawAPI.refresh();
    }
  }, [refreshWhiteboard, excalidrawAPI]);

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
    if (mousePointerLocation && excalidrawAPI) {
      try {
        const { pointer, button, name, userId, selectedElementIds } =
          JSON.parse(mousePointerLocation);
        if (typeof userId === 'undefined' || userId === '') {
          return;
        }

        collaborators.current.set(userId, {
          pointer,
          button,
          selectedElementIds,
          id: userId,
          username: name,
        });
        excalidrawAPI.updateScene({
          collaborators: new Map(collaborators.current),
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [excalidrawAPI, mousePointerLocation]);

  // for cleaning up collaborators if disconnected
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    const currentSize = collaborators.current.size;
    // now check if any user still exists after disconnected
    collaborators.current.forEach((_, i) => {
      const found = participants.find((p) => p.userId === i);
      if (!found) {
        collaborators.current.delete(i);
      }
    });

    if (currentSize !== collaborators.current.size) {
      excalidrawAPI.updateScene({
        collaborators: new Map(collaborators.current),
      });
    }
  }, [excalidrawAPI, participants]);

  return { viewModeEnabled };
};

export default useWhiteboardSetup;
