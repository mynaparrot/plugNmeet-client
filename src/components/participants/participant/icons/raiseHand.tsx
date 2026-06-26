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
  const { positions, count } = useAppSelector(selectRaisedHandsQueue);

  if (!raisedHand) {
    return null;
  }

  const position = positions[userId];
  const showNumber = count >= 2 && !!position;

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
