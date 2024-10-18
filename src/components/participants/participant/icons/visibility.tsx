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
        <div className="visibility ltr:mr-2 rtl:ml-2 cursor-pointer mt-[2px]">
          <i className="pnm-eye-slash secondaryColor text-xs" />
        </div>
      );
    }

    return null;
  }, [visibility]);

  return <>{render}</>;
};

export default VisibilityIcon;
