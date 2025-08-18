import { useState, useEffect } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useAppSelector } from '../../../../store';
import { addPreloadedLibraryItems } from '../utils';

interface IUseWhiteboardPermissions {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter: boolean | undefined;
  lockWhiteboard: boolean | undefined;
}

const useWhiteboardPermissions = ({
  excalidrawAPI,
  isPresenter,
  lockWhiteboard,
}: IUseWhiteboardPermissions) => {
  const currentUser = useAppSelector((state) => state.session.currentUser);
  const defaultLock = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.defaultLockSettings?.lockWhiteboard,
  );
  const [viewModeEnabled, setViewModeEnabled] = useState(true);

  useEffect(() => {
    if (!excalidrawAPI && !currentUser?.isRecorder && !defaultLock) {
      setViewModeEnabled(false);
    }
  }, [excalidrawAPI, currentUser?.isRecorder, defaultLock]);

  useEffect(() => {
    if (typeof lockWhiteboard === 'undefined' || currentUser?.isRecorder) {
      return;
    }
    setViewModeEnabled(lockWhiteboard);
  }, [lockWhiteboard, currentUser?.isRecorder]);

  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    if (isPresenter) {
      setViewModeEnabled(false);
      addPreloadedLibraryItems(excalidrawAPI);
    } else if (!currentUser?.isRecorder) {
      setViewModeEnabled(lockWhiteboard ?? true);
    }
  }, [excalidrawAPI, isPresenter, currentUser?.isRecorder, lockWhiteboard]);

  return { viewModeEnabled };
};

export default useWhiteboardPermissions;
