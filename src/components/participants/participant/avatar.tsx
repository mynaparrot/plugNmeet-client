import React from 'react';
import { IParticipant } from '../../../store/slices/interfaces/participant';
import { generateAvatarInitial } from '../../../helpers/utils';

interface IAvatarProps {
  participant: IParticipant;
}
const Avatar = ({ participant }: IAvatarProps) => {
  const initials = generateAvatarInitial(participant.name);

  return (
    <div className="thumb h-7 3xl:h-9 w-7 3xl:w-9 rounded-lg 3xl:rounded-xl bg-[#069] text-xs 3xl:text-base font-medium text-white flex items-center justify-center overflow-hidden">
      {participant.metadata.profilePic ? (
        <img
          src={participant.metadata.profilePic}
          alt={participant.name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default React.memo(Avatar);
