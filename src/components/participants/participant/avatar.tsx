import React from 'react';
import { IParticipant } from '../../../store/slices/interfaces/participant';

interface IAvatarProps {
  participant: IParticipant;
}
const Avatar = ({ participant }: IAvatarProps) => {
  const render = () => {
    if (participant.metadata.profilePic) {
      return (
        <img src={participant.metadata.profilePic} alt={participant.name} />
      );
    } else {
      return <>{participant.name.slice(0, 2).toUpperCase()}</>;
    }
  };
  return (
    <div className="thumb h-9 w-9 rounded-xl bg-[#069] text-base font-medium text-white flex items-center justify-center">
      {render()}
    </div>
  );
};

export default Avatar;
