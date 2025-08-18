import { useEffect } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useAppSelector } from '../../../../store';

interface IUseWhiteboardResizeHandler {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

const useWhiteboardResizeHandler = ({
  excalidrawAPI,
}: IUseWhiteboardResizeHandler) => {
  const isActiveParticipantsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveParticipantsPanel,
  );
  const isActiveChatPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveChatPanel,
  );
  const isEnabledExtendedVerticalCamView = useAppSelector(
    (state) => state.bottomIconsActivity.isEnabledExtendedVerticalCamView,
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      excalidrawAPI?.refresh();
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    excalidrawAPI,
    isActiveParticipantsPanel,
    isActiveChatPanel,
    isEnabledExtendedVerticalCamView,
  ]);
};

export default useWhiteboardResizeHandler;
