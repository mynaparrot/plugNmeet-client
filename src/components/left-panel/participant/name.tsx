import React from 'react';

interface IParticipantNameProps {
  name: string;
  isCurrentUser: boolean;
}
const ParticipantName = ({ name, isCurrentUser }: IParticipantNameProps) => {
  return (
    <p className="text-[11px] xl:text-[13px] text-[#003767]">
      {name} {isCurrentUser ? ' (me)' : null}
    </p>
  );
};

export default ParticipantName;
