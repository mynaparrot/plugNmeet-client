import React from 'react';
import { useTranslation } from 'react-i18next';

interface IParticipantNameProps {
  name: string;
  isCurrentUser: boolean;
}
const ParticipantName = ({ name, isCurrentUser }: IParticipantNameProps) => {
  const { t } = useTranslation();
  return (
    <p className="text-xs 3xl:text-sm font-medium text-Gray-800">
      {name} {isCurrentUser ? t('left-panel.me') : null}
    </p>
  );
};

export default ParticipantName;
