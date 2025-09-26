import { useEffect } from 'react';

import {
  updateIsActiveChatPanel,
  updateIsActiveParticipantsPanel,
} from '../../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../../store';

export const useCloseSidePanelsOnShow = (
  shouldShow: boolean,
  isRecorder: boolean | undefined,
) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (shouldShow && !isRecorder) {
      const timeout = setTimeout(() => {
        dispatch(updateIsActiveChatPanel(false));
        dispatch(updateIsActiveParticipantsPanel(false));
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [shouldShow, isRecorder, dispatch]);
};
