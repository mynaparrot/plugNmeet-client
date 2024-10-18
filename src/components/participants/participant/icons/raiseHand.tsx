import React, { useMemo } from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IRaiseHandIconProps {
  userId: string;
}
const RaiseHandIcon = ({ userId }: IRaiseHandIconProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );

  const render = useMemo(() => {
    if (raisedHand) {
      return (
        <div className="hand ltr:mr-2 rtl:ml-2 cursor-pointer">
          <i className="pnm-raise-hand text-[#ffbd40] text-[10px]" />
        </div>
      );
    } else {
      return null;
    }
  }, [raisedHand]);

  return <>{render}</>;
};

export default RaiseHandIcon;
