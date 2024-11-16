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
      return <i className="pnm-mic-mute text-white text-[9px]" />;
    } else {
      return <i className="pnm-mic-unmute text-white text-[9px]" />;
    }
  };

  return (
    <>
      {audioTracks ? (
        <div className="mic-status cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center">
          {render()}
        </div>
      ) : null}
    </>
  );
};

export default MicStatus;
