import React from 'react';
import { useTranslation } from 'react-i18next';

const WaitingRoom = () => {
  const { t } = useTranslation();
  return <>{t('notifications.waiting-for-approval')}</>;
};

export default WaitingRoom;
