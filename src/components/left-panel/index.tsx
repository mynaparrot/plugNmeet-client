import React from 'react';
import { Room } from 'livekit-client';

import ParticipantsComponent from '../participants';

interface ILeftPanelProps {
  currentRoom: Room;
}

const LeftPanel = ({ currentRoom }: ILeftPanelProps) => {
  return (
    <div
      id="main-left-panel"
      className="participants-wrapper scrollBar relative z-10 left-0 top-0 h-full w-[200px] xl:w-[270px] px-2 xl:px-4 pt-2 xl:pt-5 overflow-auto multi-gradient"
    >
      <ParticipantsComponent currentRoom={currentRoom} />
    </div>
  );
};

export default React.memo(LeftPanel);
