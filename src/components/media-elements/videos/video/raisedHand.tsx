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

  return raisedHand && <HandsIconSVG classes="h-4 w-auto" />;
};
export default RaisedHand;
