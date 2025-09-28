import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
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

  return (
    raisedHand && (
      <IconWrapper>
        <HandsIconSVG classes={'h-3 3xl:h-4 w-auto'} />
      </IconWrapper>
    )
  );
};

export default RaiseHandIcon;
