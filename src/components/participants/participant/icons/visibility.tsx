import React from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface VisibilityIconProps {
  userId: string;
}

const VisibilityIcon = ({ userId }: VisibilityIconProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );

  const render = () => {
    if (participant?.visibility === 'hidden') {
      return (
        <div className="visibility mr-2 cursor-pointer mt-[2px]">
          <i className="pnm-eye-slash secondaryColor text-xs" />
        </div>
      );
    }

    return null;
  };

  return render();
};

export default VisibilityIcon;
