import React from 'react';
import { IParticipant } from '../../../../store/slices/interfaces/participant';

interface IAvatarProps {
  participant?: IParticipant;
  name: string;
}

const Avatar = ({ participant, name }: IAvatarProps) => {
  const render = () => {
    if (participant?.metadata?.profilePic) {
      return (
        <img src={participant?.metadata.profilePic} alt={participant.name} />
      );
    } else {
      let n = name;
      if (participant?.name) {
        n = participant?.name;
      }
      return <>{n?.slice(0, 2).toUpperCase()}</>;
    }
  };
  return (
    <div className="avatar flex items-center justify-center text-white h-8 w-8 overflow-hidden rounded-full shadow-header bg-primaryColor">
      {render()}
    </div>
  );
};

export default Avatar;
