import React, { useMemo } from 'react';
import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface VisibilityIconProps {
  userId: string;
}

const VisibilityIcon = ({ userId }: VisibilityIconProps) => {
  const visibility = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.visibility,
  );

  const render = useMemo(() => {
    if (visibility === 'hidden') {
      return (
        <div className="visibility cursor-pointer w-6 3xl:w-8 h-6 3xl:h-8 flex items-center justify-center">
          <i className="pnm-eye-slash text-Gray-950 text-sm 3xl:text-base" />
        </div>
      );
    }

    return null;
  }, [visibility]);

  return <>{render}</>;
};

export default VisibilityIcon;
