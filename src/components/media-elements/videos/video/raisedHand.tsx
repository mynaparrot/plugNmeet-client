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
  const isRaisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand
        ?.isRaised,
  );

  const position = useAppSelector(
    (state) => selectRaisedHandsQueue(state).positions[userId],
  );
  const showNumber = useAppSelector((state) => {
    const queue = selectRaisedHandsQueue(state);
    return queue.count >= 2 && !!queue.positions[userId];
  });

  if (!isRaisedHand) {
    return null;
  }

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
