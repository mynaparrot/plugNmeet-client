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
  const collaborators = useRef(new Map<SocketId, Collaborator>());

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
      if (typeof lockWhiteboard === 'boolean') {
        // A user-specific lock is set, so we use it.
        setViewModeEnabled(lockWhiteboard);
      } else {
        // No user-specific lock, so we fall back to the room's default lock setting.
        setViewModeEnabled(defaultLock ?? true);
      }
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
