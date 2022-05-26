import React from 'react';
import { Room } from 'livekit-client';
import ChatComponent from '../chat';

interface IRightPanelProps {
  currentRoom: Room;
  isRecorder: boolean;
}

const RightPanel = ({ currentRoom, isRecorder }: IRightPanelProps) => {
  return (
    <div id="main-right-panel" className="h-[calc(100%)]">
      <ChatComponent currentRoom={currentRoom} isRecorder={isRecorder} />
    </div>
  );
};

export default React.memo(RightPanel);
