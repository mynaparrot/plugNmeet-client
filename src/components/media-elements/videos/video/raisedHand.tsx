import React from 'react';

import { useAppSelector } from '../../../../store';
import {
  participantsSelector,
  selectRaisedHandsQueue,
} from '../../../../store/slices/participantSlice';
import { HandsIconSVG } from '../../../../assets/Icons/HandsIconSVG';

interface RaisedHandProps {
  userId: string;
}

const RaisedHand = ({ userId }: RaisedHandProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );
  const { positions, count } = useAppSelector(selectRaisedHandsQueue);

  if (!raisedHand) {
    return null;
  }

  const position = positions[userId];
  const showNumber = count >= 2 && !!position;

  return (
    <div className="raised-hand absolute bottom-0 right-4 cursor-pointer w-7 h-7 rounded-full bg-Blue2-500 flex items-center justify-center">
      <HandsIconSVG classes="h-4 w-auto" />
      {showNumber && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-Blue2-500 text-[10px] leading-4 font-semibold text-center">
          {position}
        </span>
      )}
    </div>
  );
};
export default RaisedHand;
