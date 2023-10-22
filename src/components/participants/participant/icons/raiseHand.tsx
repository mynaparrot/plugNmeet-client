import React, { useMemo } from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IRaiseHandIconProps {
  userId: string;
}
const RaiseHandIcon = ({ userId }: IRaiseHandIconProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const render = useMemo(() => {
    if (participant?.metadata.raised_hand) {
      return (
        <div className="hand ltr:mr-2 rtl:ml-2 cursor-pointer">
          <i className="pnm-raise-hand text-[#ffbd40] text-[10px]" />
        </div>
      );
    } else {
      return null;
    }
  }, [participant?.metadata.raised_hand]);

  return <>{render}</>;
};

export default RaiseHandIcon;
