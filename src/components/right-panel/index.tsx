import React from 'react';
import { Room } from 'livekit-client';

import ChatComponent from '../chat';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';
import { useAppDispatch } from '../../store';

interface IRightPanelProps {
  currentRoom: Room;
  isRecorder: boolean;
}

const RightPanel = ({ currentRoom, isRecorder }: IRightPanelProps) => {
  const dispatch = useAppDispatch();

  const closePanel = () => {
    dispatch(updateIsActiveChatPanel(false));
  };

  return (
    <div id="main-right-panel" className="h-[calc(100%)]">
      {!isRecorder ? (
        <div
          className="hidden md:inline-block close absolute -left-[14px] z-20 top-1 w-6 h-6 rounded-full border border-solid border-primaryColor dark:border-darkText bg-white dark:bg-darkSecondary cursor-pointer"
          onClick={closePanel}
        >
          <span className="inline-block w-[18px] h-[1px] bg-primaryColor dark:bg-darkText absolute rotate-45 top-[11px] left-[2px]"></span>
          <span className="inline-block w-[18px] h-[1px] bg-primaryColor dark:bg-darkText absolute -rotate-45 top-[11px] right-[2px]"></span>
        </div>
      ) : null}
      <ChatComponent currentRoom={currentRoom} isRecorder={isRecorder} />
    </div>
  );
};

export default React.memo(RightPanel);
