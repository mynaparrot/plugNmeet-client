import React, { useMemo } from 'react';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IPresenterIconProps {
  userId: string;
}

const PresenterIcon = ({ userId }: IPresenterIconProps) => {
  const isPresenter = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.isPresenter,
  );

  const render = useMemo(() => {
    if (isPresenter) {
      return (
        <div className="presenter cursor-pointer w-8 h-8 flex items-center justify-center">
          <i className="pnm-presenter text-Gray-950 text-base" />
        </div>
      );
    }

    return null;
  }, [isPresenter]);

  return <>{render}</>;
};

export default PresenterIcon;
