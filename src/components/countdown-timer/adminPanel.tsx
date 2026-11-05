import { useState } from 'react';

import SetupPanel from './setupPanel';
import LiveControlPanel from './liveControlPanel';

interface IAdminPanelProps {
  isIdle: boolean;
  isPaused: boolean;
  isFinished: boolean;
  formattedTime: string;
  isLoading: boolean;
  onStart: (durationSeconds: number) => void;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onEndTimer: () => void;
}

// Rendered inside PopoverPanel, so it unmounts when the popover closes and
// any "set new timer" draft is discarded instead of sticking to the next open.
const AdminPanel = ({
  isIdle,
  isPaused,
  isFinished,
  formattedTime,
  isLoading,
  onStart,
  onPause,
  onResume,
  onExtend,
  onEndTimer,
}: IAdminPanelProps) => {
  const [isSettingNewTimer, setIsSettingNewTimer] = useState(false);

  if (isIdle || (isFinished && isSettingNewTimer)) {
    return (
      <SetupPanel
        isLoading={isLoading}
        onStart={(durationSeconds) => {
          setIsSettingNewTimer(false);
          onStart(durationSeconds);
        }}
      />
    );
  }

  return (
    <LiveControlPanel
      formattedTime={formattedTime}
      isPaused={isPaused}
      isFinished={isFinished}
      isLoading={isLoading}
      onPause={onPause}
      onResume={onResume}
      onExtend={onExtend}
      onEndTimer={onEndTimer}
      onSetNewTimer={() => setIsSettingNewTimer(true)}
    />
  );
};

export default AdminPanel;
