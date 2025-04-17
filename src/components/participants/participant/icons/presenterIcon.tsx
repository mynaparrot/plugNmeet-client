import React from 'react';

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

  return !isPresenter ? null : (
    <div className="presenter cursor-pointer w-6 3xl:w-8 h-6 3xl:h-8 flex items-center justify-center">
      <i className="pnm-presenter text-Gray-950 text-sm 3xl:text-base" />
    </div>
  );
};

export default PresenterIcon;
