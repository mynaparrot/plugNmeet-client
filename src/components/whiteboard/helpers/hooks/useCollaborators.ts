import { useEffect } from 'react';
import {
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from '@excalidraw/excalidraw/types';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

const collaborators = new Map<SocketId, Collaborator>();

interface IUseCollaborators {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const useCollaborators = ({ excalidrawAPI }: IUseCollaborators) => {
  const participants = useAppSelector(participantsSelector.selectAll);
  const mousePointerLocation = useAppSelector(
    (state) => state.whiteboard.mousePointerLocation,
  );

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

  // for handling mouse pointer location
  useEffect(() => {
    if (mousePointerLocation && excalidrawAPI) {
      try {
        const { pointer, button, name, userId, selectedElementIds } =
          JSON.parse(mousePointerLocation);
        if (typeof userId === 'undefined' || userId === '') {
          return;
        }

        const user: Collaborator = {
          pointer,
          button,
          selectedElementIds,
          id: userId,
          username: name,
        };
        collaborators.set(userId, user);

        excalidrawAPI.updateScene({ collaborators: new Map(collaborators) });
      } catch (e) {
        console.error(e);
      }
    }
  }, [excalidrawAPI, mousePointerLocation]);
};

export default useCollaborators;
