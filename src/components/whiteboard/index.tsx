import React, { useEffect, useState } from 'react';
import throttle from 'lodash/throttle';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { createSelector } from '@reduxjs/toolkit';
import Excalidraw, { getSceneVersion } from '@excalidraw/excalidraw';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import {
  ExcalidrawImperativeAPI,
  Gesture,
  Collaborator,
  // eslint-disable-next-line import/no-unresolved
} from '@excalidraw/excalidraw/types/types';

import VerticalWebcams from '../main-area/media-elements/vertical-webcams';
import './style.css';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { useCallbackRefState } from './hooks/useCallbackRefState';
import {
  DataMessageType,
  IDataMessage,
  WhiteboardMsg,
  WhiteboardMsgType,
} from '../../store/slices/interfaces/dataMessages';
import {
  isSocketConnected,
  sendWebsocketMessage,
} from '../../helpers/websocketConnector';
import { ReconciledElements, reconcileElements } from './collab/reconciliation';
import { participantsSelector } from '../../store/slices/participantSlice';
import { useTranslation } from 'react-i18next';
import { updateExcalidrawElements } from '../../store/slices/whiteboard';

interface IWhiteboardProps {
  videoSubscribers?: Map<string, LocalParticipant | RemoteParticipant>;
}

const excalidrawElementsSelector = createSelector(
  (state: RootState) => state.whiteboard.excalidrawElements,
  (excalidrawElements) => excalidrawElements,
);
const mousePointerLocationSelector = createSelector(
  (state: RootState) => state.whiteboard.mousePointerLocation,
  (mousePointerLocation) => mousePointerLocation,
);
const heightSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.screenHeight,
  (screenHeight) => screenHeight,
);

const Whiteboard = ({ videoSubscribers }: IWhiteboardProps) => {
  const currentUser = store.getState().session.currenUser;
  const currentRoom = store.getState().session.currentRoom;
  let lastBroadcastedOrReceivedSceneVersion = -1;
  const CURSOR_SYNC_TIMEOUT = 33;
  let lastElements: readonly ExcalidrawElement[] = [];

  const height = useAppSelector(heightSelector);
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const participants = useAppSelector(participantsSelector.selectAll);
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const [viewModeEnabled, setViewModeEnabled] = useState(true);
  const [theme, setTheme] = useState('light');
  const excalidrawElements = useAppSelector(excalidrawElementsSelector);
  const mousePointerLocation = useAppSelector(mousePointerLocationSelector);
  const collaborators = new Map<string, Collaborator>();

  useEffect(() => {
    if (currentUser?.metadata?.is_admin) {
      setViewModeEnabled(false);
    }
    setTheme('light');

    return () => {
      if (lastElements.length) {
        dispatch(updateExcalidrawElements(JSON.stringify(lastElements)));
      }
    };
    //eslint-disable-next-line
  }, [lastElements]);

  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    participants.forEach((participant) => {
      if (participant.metadata.is_admin) {
        if (!collaborators.has(participant.userId)) {
          collaborators.set(participant.userId, {});
        }
      }
    });

    excalidrawAPI.updateScene({ collaborators });
    //eslint-disable-next-line
  }, [participants, excalidrawAPI]);

  useEffect(() => {
    if (excalidrawElements && excalidrawAPI) {
      const elements = JSON.parse(excalidrawElements);
      const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const appState = excalidrawAPI.getAppState();

      const reconciledElements = reconcileElements(
        localElements,
        elements,
        appState,
      );

      handleRemoteSceneUpdate(reconciledElements);
    }
    //eslint-disable-next-line
  }, [excalidrawElements, excalidrawAPI]);

  useEffect(() => {
    if (mousePointerLocation) {
      const { pointer, button, name, userId, selectedElementIds } =
        JSON.parse(mousePointerLocation);

      const tmp: any = new Map(collaborators);
      const user = tmp.get(userId) ?? {};
      user.pointer = pointer;
      user.button = button;
      user.selectedElementIds = selectedElementIds;
      user.username = name;
      tmp.set(userId, user);

      excalidrawAPI?.updateScene({ collaborators: tmp });
    }
    //eslint-disable-next-line
  }, [mousePointerLocation]);

  const handleRemoteSceneUpdate = (
    elements: ReconciledElements,
    { init = false }: { init?: boolean } = {},
  ) => {
    excalidrawAPI?.updateScene({
      elements,
      commitToHistory: init,
    });
    lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);

    // We haven't yet implemented multiplayer undo functionality, so we clear the undo stack
    // when we receive any messages from another peer. This UX can be pretty rough -- if you
    // undo, a user makes a change, and then try to redo, your element(s) will be lost. However,
    // right now we think this is the right tradeoff.
    excalidrawAPI?.history.clear();

    // TO DO
    // loadImageFiles();
  };

  const onChange = (elements: readonly ExcalidrawElement[]) => {
    if (
      excalidrawAPI &&
      currentUser &&
      elements.length &&
      isSocketConnected()
    ) {
      if (viewModeEnabled) {
        return;
      }
      if (getSceneVersion(elements) > lastBroadcastedOrReceivedSceneVersion) {
        lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);

        const info: WhiteboardMsg = {
          type: WhiteboardMsgType.SCENE_UPDATE,
          from: {
            sid: currentUser.sid,
            userId: currentUser.userId,
          },
          msg: JSON.stringify(elements),
        };

        const data: IDataMessage = {
          type: DataMessageType.WHITEBOARD,
          room_sid: currentRoom.sid,
          room_id: currentRoom.room_id,
          message_id: '',
          body: info,
        };

        sendWebsocketMessage(JSON.stringify(data));
        lastElements = elements;
      }
    }
  };

  const onPointerUpdate = throttle(
    (payload: { pointer; button; pointersMap: Gesture['pointers'] }) => {
      if (viewModeEnabled) {
        return;
      }
      if (payload.pointersMap.size < 2 && currentUser && isSocketConnected()) {
        const msg = {
          pointer: payload.pointer,
          button: payload.button || 'up',
          selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
          userId: currentUser.userId,
          name: currentUser.name,
        };

        const info: WhiteboardMsg = {
          type: WhiteboardMsgType.POINTER_UPDATE,
          from: {
            sid: currentUser.sid,
            userId: currentUser.userId,
          },
          msg: JSON.stringify(msg),
        };

        const data: IDataMessage = {
          type: DataMessageType.WHITEBOARD,
          room_id: currentRoom.room_id,
          room_sid: currentRoom.sid,
          message_id: '',
          body: info,
        };

        sendWebsocketMessage(JSON.stringify(data));
      }
    },
    CURSOR_SYNC_TIMEOUT,
  );

  const render = () => {
    return (
      <Excalidraw
        ref={excalidrawRefCallback}
        onChange={onChange}
        onPointerUpdate={onPointerUpdate}
        viewModeEnabled={viewModeEnabled}
        isCollaborating={true}
        theme={theme}
        name="plugNmeet whiteboard"
        UIOptions={{ canvasActions: { loadScene: false, export: false } }}
        autoFocus={true}
        detectScroll={true}
        langCode={i18n.languages[0]}
      />
    );
  };

  return (
    <div className="shared-notepad-wrapper h-full">
      {/*{if videoSubscribers has webcams}*/}
      <VerticalWebcams videoSubscribers={videoSubscribers} />

      <div className="excalidraw-wrapper" style={{ height: height - 120 }}>
        {render()}
      </div>
    </div>
  );
};

export default React.memo(Whiteboard);
