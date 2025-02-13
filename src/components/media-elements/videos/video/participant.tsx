import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { HandsIconSVG } from '../../../../assets/Icons/HandsIconSVG';

export interface IParticipantProps {
  userId: string;
  name: string;
  isLocal: boolean;
}

const Participant = ({ userId, name, isLocal }: IParticipantProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );

  return (
    <div className="name absolute bottom-4 left-4 text-sm font-medium text-white z-10">
      {name} {isLocal ? '(me)' : null}
      {raisedHand ? <HandsIconSVG classes="h-4 w-auto" /> : null}
    </div>
  );
};

export default Participant;
