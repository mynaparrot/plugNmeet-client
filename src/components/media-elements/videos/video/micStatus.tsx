import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IMicStatusProps {
  userId: string;
}

const MicStatus = ({ userId }: IMicStatusProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const render = () => {
    if (participant?.isMuted) {
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
    <>
      {participant?.audioTracks ? (
        <div className="mic-status">{render()}</div>
      ) : null}
    </>
  );
};

export default MicStatus;
