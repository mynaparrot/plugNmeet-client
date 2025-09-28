import React from 'react';

import RaisedHand from './raisedHand';

export interface IParticipantProps {
  userId: string;
  name: string;
  isLocal: boolean;
}

const Participant = ({ userId, name, isLocal }: IParticipantProps) => {
  return (
    <div className="name absolute bottom-4 left-4 text-sm font-medium text-white z-10 flex items-center gap-2">
      {name} {isLocal && '(me)'}
      <RaisedHand userId={userId} />
    </div>
  );
};

export default Participant;
