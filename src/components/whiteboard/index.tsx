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
import {
  updateExcalidrawElements,
  updateLastExcalidrawElements,
} from '../../store/slices/whiteboard';
import UploadFiles from './uploadFiles';
import { IWhiteboardFile } from '../../store/slices/interfaces/whiteboard';
import { getFile } from './data/fileReader';

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
const whiteboardFilesSelector = createSelector(
  (state: RootState) => state.whiteboard.whiteboardFiles,
  (whiteboardFiles) => whiteboardFiles,
);

const Whiteboard = ({ videoSubscribers }: IWhiteboardProps) => {
  const currentUser = store.getState().session.currenUser;
  const currentRoom = store.getState().session.currentRoom;
  let lastBroadcastedOrReceivedSceneVersion = -1;
  const CURSOR_SYNC_TIMEOUT = 33;

  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const participants = useAppSelector(participantsSelector.selectAll);
  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();
  const [viewModeEnabled, setViewModeEnabled] = useState(true);
  const [theme, setTheme] = useState('light');
  const excalidrawElements = useAppSelector(excalidrawElementsSelector);
  const mousePointerLocation = useAppSelector(mousePointerLocationSelector);
  const whiteboardFiles = useAppSelector(whiteboardFilesSelector);
  const collaborators = new Map<string, Collaborator>();

  useEffect(() => {
    if (currentUser?.metadata?.is_admin) {
      setViewModeEnabled(false);
    }
    setTheme('light');

    return () => {
      const lastExcalidrawElements =
        store.getState().whiteboard.lastExcalidrawElements;
      dispatch(updateExcalidrawElements(lastExcalidrawElements));
    };
    //eslint-disable-next-line
  }, []);

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

  useEffect(() => {
    const addFile = async (url, fileName) => {
      const result: any = await getFile(url, fileName);
      if (result && excalidrawAPI) {
        excalidrawAPI.addFiles([result.image]);

        let elements = excalidrawAPI
          .getSceneElementsIncludingDeleted()
          .filter((elm) => elm.id);
        const hasElm = elements.filter((elm) => elm.id === fileName);

        if (!hasElm.length) {
          // we shouldn't push if element already there.
          // otherwise, it will override if element's position was changed
          elements.push(result.elm);
        } else if (hasElm.length && hasElm[0].isDeleted) {
          // if deleted then we can consider adding again
          elements = excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .filter((elm) => elm.id !== fileName);
          elements.push(result.elm);
        }

        excalidrawAPI.updateScene({
          elements: elements,
        });
      }
    };

    if (whiteboardFiles && excalidrawAPI) {
      const files: Array<IWhiteboardFile> = JSON.parse(whiteboardFiles);
      files.forEach((file) => {
        const url =
          (window as any).PLUG_N_MEET_SERVER_URL +
          '/download/chat/' +
          file.filePath;

        addFile(url, file.fileName);
      });
    }
  }, [whiteboardFiles, excalidrawAPI]);

  const handleRemoteSceneUpdate = (
    elements: ReconciledElements,
    { init = false }: { init?: boolean } = {},
  ) => {
    if (!elements.length) {
      return;
    }

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
        const msg = JSON.stringify(elements);

        const info: WhiteboardMsg = {
          type: WhiteboardMsgType.SCENE_UPDATE,
          from: {
            sid: currentUser.sid,
            userId: currentUser.userId,
          },
          msg: msg,
        };

        const data: IDataMessage = {
          type: DataMessageType.WHITEBOARD,
          room_sid: currentRoom.sid,
          room_id: currentRoom.room_id,
          message_id: '',
          body: info,
        };

        sendWebsocketMessage(JSON.stringify(data));
        dispatch(updateLastExcalidrawElements(msg));
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

  const renderTopRightUI = () => {
    return <>{currentUser?.metadata?.is_admin ? <UploadFiles /> : null}</>;
  };

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
        renderTopRightUI={renderTopRightUI}
      />
    );
  };

  return (
    <div className="shared-notepad-wrapper h-full flex">
      {/*{if videoSubscribers has webcams}*/}
      <VerticalWebcams videoSubscribers={videoSubscribers} />

      <div className="excalidraw-wrapper flex-1 w-full h-full sm:px-5">
        {render()}
      </div>
    </div>
  );
};

export default React.memo(Whiteboard);
