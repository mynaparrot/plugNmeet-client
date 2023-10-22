import React from 'react';
import { IParticipant } from '../../../store/slices/interfaces/participant';

interface IAvatarProps {
  participant: IParticipant;
}
const Avatar = ({ participant }: IAvatarProps) => {
  const render = () => {
    if (participant.metadata.profile_pic) {
      return (
        <img src={participant.metadata.profile_pic} alt={participant.name} />
      );
    } else {
      return <>{participant.name.slice(0, 2).toUpperCase()}</>;
    }
  };
  return (
    <div className="thumb h-[22px] xl:h-[30px] w-[22px] xl:w-[30px] ltr:mr-2 rtl:ml-2 rounded-full overflow-hidden bg-primaryColor flex items-center justify-center text-white text-xs xl:text-sm">
      {render()}
    </div>
  );
};

export default Avatar;
