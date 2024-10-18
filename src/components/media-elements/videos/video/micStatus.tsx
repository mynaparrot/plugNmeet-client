import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IMicStatusProps {
  userId: string;
}

const MicStatus = ({ userId }: IMicStatusProps) => {
  const audioTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioTracks,
  );
  const isMuted = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.isMuted,
  );

  const render = () => {
    if (isMuted) {
      return (
        <p className="mute">
          <i className="pnm-mic-mute text-white text-[9px]" />
        </p>
      );
    } else {
      return (
        <p className="mute">
          <i className="pnm-mic-unmute text-white text-[9px]" />
        </p>
      );
    }
  };

  return (
    <>{audioTracks ? <div className="mic-status">{render()}</div> : null}</>
  );
};

export default MicStatus;
