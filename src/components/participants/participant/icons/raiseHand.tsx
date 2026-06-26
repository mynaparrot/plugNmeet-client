import React from 'react';
import { useAppSelector } from '../../../../store';
import {
  participantsSelector,
  selectRaisedHandsQueue,
} from '../../../../store/slices/participantSlice';
import { HandsIconSVG } from '../../../../assets/Icons/HandsIconSVG';
import IconWrapper from './iconWrapper';

interface IRaiseHandIconProps {
  userId: string;
}
const RaiseHandIcon = ({ userId }: IRaiseHandIconProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );
  // select primitives so this row only re-renders when ITS own position
  // changes or when the count crosses the threshold of 2 — not on every
  // raise/lower of other participants.
  const position = useAppSelector(
    (state) => selectRaisedHandsQueue(state).positions[userId],
  );
  const showNumber = useAppSelector((state) => {
    const queue = selectRaisedHandsQueue(state);
    return queue.count >= 2 && !!queue.positions[userId];
  });

  if (!raisedHand) {
    return null;
  }

  return (
    <IconWrapper>
      <div className="relative flex items-center justify-center">
        <HandsIconSVG classes={'h-3 3xl:h-4 w-auto dark:text-white'} />
        {showNumber && (
          <span className="absolute -top-2 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-Blue2-500 text-white text-[9px] leading-[14px] font-semibold text-center">
            {position}
          </span>
        )}
      </div>
    </IconWrapper>
  );
};

export default RaiseHandIcon;
