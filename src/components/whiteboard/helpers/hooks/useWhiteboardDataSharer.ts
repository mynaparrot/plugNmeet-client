import { useEffect, useState } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useAppSelector } from '../../../../store';
import {
  sendRequestedForWhiteboardData,
  sendWhiteboardDataAsDonor,
} from '../handleRequestedWhiteboardData';

interface IUseWhiteboardDataSharer {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const useWhiteboardDataSharer = ({
  excalidrawAPI,
}: IUseWhiteboardDataSharer) => {
  const [fetchedData, setFetchedData] = useState<boolean>(false);
  const requestedWhiteboardData = useAppSelector(
    (state) => state.whiteboard.requestedWhiteboardData,
  );

  // keep looking for request from other users & send data
  useEffect(() => {
    if (!fetchedData && excalidrawAPI) {
      // get initial data from other users who had joined before me
      sendRequestedForWhiteboardData().then(() => setFetchedData(true));
    }

    if (requestedWhiteboardData.requested && excalidrawAPI) {
      sendWhiteboardDataAsDonor(
        excalidrawAPI,
        requestedWhiteboardData.sendTo,
      ).then();
    }
  }, [excalidrawAPI, requestedWhiteboardData, fetchedData]);

  return { fetchedData };
};

export default useWhiteboardDataSharer;
