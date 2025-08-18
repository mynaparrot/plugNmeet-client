import { useState, useEffect } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useAppSelector } from '../../../../store';
import {
  sendRequestedForWhiteboardData,
  sendWhiteboardDataAsDonor,
} from '../handleRequestedWhiteboardData';
import { displaySavedPageData } from '../utils';

interface IUseWhiteboardLifecycle {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const useWhiteboardLifecycle = ({ excalidrawAPI }: IUseWhiteboardLifecycle) => {
  const [fetchedData, setFetchedData] = useState<boolean>(false);
  const requestedWhiteboardData = useAppSelector(
    (state) => state.whiteboard.requestedWhiteboardData,
  );
  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);

  // on mount: if presenter, display saved data
  useEffect(() => {
    if (excalidrawAPI && isPresenter) {
      // if presenter then we'll fetch storage to display after initialize excalidraw
      const timeout = setTimeout(() => {
        displaySavedPageData(excalidrawAPI, isPresenter, currentPage);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [excalidrawAPI, isPresenter, currentPage]);

  // keep looking for request from other users & send data
  useEffect(() => {
    if (!fetchedData && excalidrawAPI) {
      // get initial data from other users who had joined before me
      sendRequestedForWhiteboardData();
      setFetchedData(true);
    }

    if (requestedWhiteboardData.requested && excalidrawAPI) {
      sendWhiteboardDataAsDonor(excalidrawAPI, requestedWhiteboardData.sendTo);
    }
  }, [excalidrawAPI, requestedWhiteboardData, fetchedData]);

  return { fetchedData };
};

export default useWhiteboardLifecycle;
