import React from 'react';

import { useAppSelector } from '../../../../store';
import IconWrapper from './iconWrapper';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface IPresenterIconProps {
  userId: string;
}

const PresenterIcon = ({ userId }: IPresenterIconProps) => {
  const isPresenter = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.isPresenter,
  );

  return (
    isPresenter && (
      <IconWrapper>
        <i className="pnm-presenter text-Gray-950 text-sm 3xl:text-base" />
      </IconWrapper>
    )
  );
};

export default PresenterIcon;
