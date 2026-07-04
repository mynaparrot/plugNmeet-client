import { useEffect, useCallback, useRef, useState } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useAppSelector } from '../../../../store';
import {
  sendRequestedForWhiteboardData,
  sendWhiteboardDataAsDonor,
} from '../handleRequests';

interface IUseWhiteboardDataSharer {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const useWhiteboardDataSharer = ({
  excalidrawAPI,
}: IUseWhiteboardDataSharer) => {
  const [fetchedData, setFetchedData] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  const requestedWhiteboardData = useAppSelector(
    (state) => state.whiteboard.requestedWhiteboardData,
  );

  const fetchDataFromDonner = useCallback(() => {
    if (!fetchedData && excalidrawAPI && !isFetchingRef.current) {
      isFetchingRef.current = true;
      sendRequestedForWhiteboardData()
        .then(() => {
          setFetchedData(true);
        })
        .finally(() => {
          isFetchingRef.current = false;
        });
    }
  }, [fetchedData, excalidrawAPI]);

  // keep looking for request from other users & send data
  useEffect(() => {
    if (requestedWhiteboardData.requested && excalidrawAPI) {
      sendWhiteboardDataAsDonor(
        excalidrawAPI,
        requestedWhiteboardData.sendTo,
      ).then();
    }
  }, [excalidrawAPI, requestedWhiteboardData]);

  return { fetchedData, setFetchedData, fetchDataFromDonner };
};

export default useWhiteboardDataSharer;
