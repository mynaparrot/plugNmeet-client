import React from 'react';

import RaisedHand from './raisedHand';
import { useTranslation } from 'react-i18next';

export interface IParticipantProps {
  userId: string;
  name: string;
  isLocal: boolean;
}

const Participant = ({ userId, name, isLocal }: IParticipantProps) => {
  const { t } = useTranslation();

  return (
    <div className="name w-full absolute capitalize bottom-4 start-0 px-4 text-sm font-medium text-white z-10 flex items-center gap-2 justify-between">
      {name} {isLocal && t('left-panel.me')}
      <RaisedHand userId={userId} />
    </div>
  );
};

export default Participant;
