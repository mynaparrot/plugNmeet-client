//
import { useEffect, useState } from 'react';
import {
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from '@excalidraw/excalidraw/types';

import { useAppSelector } from '../../../../store';
import { addPreloadedLibraryItems } from '../utils';
import { selectBasicParticipants } from '../../../../store/slices/participantSlice';

const collaborators = new Map<SocketId, Collaborator>();

interface IUseWhiteboardSetup {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter: boolean | undefined;
  lockWhiteboard: boolean | undefined;
  isRecorder: boolean;
}

const useWhiteboardSetup = ({
  excalidrawAPI,
  isPresenter,
  lockWhiteboard,
  isRecorder,
}: IUseWhiteboardSetup) => {
  const [viewModeEnabled, setViewModeEnabled] = useState(true);

  const participants = useAppSelector(selectBasicParticipants);
  const defaultLock = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.defaultLockSettings?.lockWhiteboard,
  );

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

  // from useWhiteboardPermissions
  useEffect(() => {
    if (!excalidrawAPI) {
      // Before the API is ready, set view mode based on default lock for non-recorders.
      return;
    }

    // Once API is ready, presenter always has edit access.
    if (isPresenter) {
      setViewModeEnabled(false);
      addPreloadedLibraryItems(excalidrawAPI);
    } else if (!isRecorder) {
      // Non-presenters/recorders are controlled by the lockWhiteboard prop.
      setViewModeEnabled(lockWhiteboard ?? true);
    }
  }, [excalidrawAPI, isPresenter, lockWhiteboard, isRecorder, defaultLock]);

  // from useCollaborators
  useEffect(() => {
    if (mousePointerLocation && excalidrawAPI) {
      try {
        const { pointer, button, name, userId, selectedElementIds } =
          JSON.parse(mousePointerLocation);
        if (typeof userId === 'undefined' || userId === '') {
          return;
        }

        collaborators.set(userId, {
          pointer,
          button,
          selectedElementIds,
          id: userId,
          username: name,
        });
        excalidrawAPI.updateScene({ collaborators: new Map(collaborators) });
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

    const currentSize = collaborators.size;
    // now check if any user still exists after disconnected
    collaborators.forEach((_, i) => {
      const found = participants.find((p) => p.userId === i);
      if (!found) {
        collaborators.delete(i);
      }
    });

    if (currentSize !== collaborators.size) {
      excalidrawAPI.updateScene({ collaborators: new Map(collaborators) });
    }
  }, [excalidrawAPI, participants]);

  return { viewModeEnabled };
};

export default useWhiteboardSetup;
