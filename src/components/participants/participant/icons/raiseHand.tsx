import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { HandsIconSVG } from '../../../../assets/Icons/HandsIconSVG';

interface IRaiseHandIconProps {
  userId: string;
}
const RaiseHandIcon = ({ userId }: IRaiseHandIconProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );

  return !raisedHand ? null : (
    <div className="hand cursor-pointer w-6 3xl:w-8 h-6 3xl:h-8 flex items-center justify-center">
      {/* <i className="pnm-raise-hand text-[#ffbd40] text-[10px]" /> */}
      <HandsIconSVG classes={'h-3 3xl:h-4 w-auto'} />
    </div>
  );
};

export default RaiseHandIcon;
