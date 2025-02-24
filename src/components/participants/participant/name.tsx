import React from 'react';

interface IParticipantNameProps {
  name: string;
  isCurrentUser: boolean;
}
const ParticipantName = ({ name, isCurrentUser }: IParticipantNameProps) => {
  return (
    <p className="text-xs 3xl:text-sm font-medium text-Gray-800">
      {name} {isCurrentUser ? ' (me)' : null}
    </p>
  );
};

export default ParticipantName;
