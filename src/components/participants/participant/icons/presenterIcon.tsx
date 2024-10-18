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
        <div className="presenter ltr:mr-2 rtl:ml-2 cursor-pointer">
          <i className="pnm-presenter secondaryColor text-[10px]" />
        </div>
      );
    }

    return null;
  }, [isPresenter]);

  return <>{render}</>;
};

export default PresenterIcon;
