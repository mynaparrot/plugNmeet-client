import React from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { HandsIconSVG } from '../../../../assets/Icons/HandsIconSVG';

interface RaisedHandProps {
  userId: string;
}

const RaisedHand = ({ userId }: RaisedHandProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );

  return (
    raisedHand && (
      <div className="raised-hand absolute bottom-0 right-4 cursor-pointer w-7 h-7 rounded-full bg-Blue2-500 flex items-center justify-center">
        <HandsIconSVG classes="h-4 w-auto" />
      </div>
    )
  );
};
export default RaisedHand;
