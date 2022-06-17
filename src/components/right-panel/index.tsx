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
      <div
        className="hidden md:inline-block close absolute -left-[14px] z-20 top-1 w-7 h-7 rounded-full border border-solid border-primaryColor bg-white cursor-pointer"
        onClick={closePanel}
      >
        <span className="inline-block w-5 h-[1px] bg-primaryColor absolute rotate-45 top-[13px] left-[3px]"></span>
        <span className="inline-block w-5 h-[1px] bg-primaryColor absolute -rotate-45 top-[13px] right-[3px]"></span>
      </div>
      <ChatComponent currentRoom={currentRoom} isRecorder={isRecorder} />
    </div>
  );
};

export default React.memo(RightPanel);
