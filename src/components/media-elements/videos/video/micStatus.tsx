import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { Microphone } from '../../../../assets/Icons/Microphone';
import { MicrophoneOff } from '../../../../assets/Icons/MicrophoneOff';

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
      return <MicrophoneOff classes={'h-4 w-auto'} />;
    } else {
      return <Microphone classes={'h-4 w-auto'} />;
    }
  };

  return (
    <>
      {audioTracks ? (
        <div className="mic-status cursor-pointer w-7 h-7 text-white rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center absolute right-3 top-3">
          {render()}
        </div>
      ) : null}
    </>
  );
};

export default MicStatus;
