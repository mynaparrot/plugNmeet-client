import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IRaiseHandIconProps {
  userId: string;
}
const RaiseHandIcon = ({ userId }: IRaiseHandIconProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const render = () => {
    if (participant?.metadata.raised_hand) {
      return (
        <div className="hand mr-2 cursor-pointer">
          <i className="pnm-raise-hand text-[#ffbd40] text-[10px]" />
        </div>
      );
    } else {
      return null;
    }
  };

  return <>{render()}</>;
};

export default RaiseHandIcon;
