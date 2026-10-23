import React from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingIcon } from '../../assets/Icons/Loading';

const LazyFeatureFallback = ({ label }: { label?: string }) => {
  const { t } = useTranslation();
  return (
    <div className="w-full h-[calc(100%-50px)] mt-9 flex items-center justify-center">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex items-center gap-3 text-sm text-Gray-700 dark:text-dark-text"
      >
        <LoadingIcon className="inline h-8 w-8 animate-spin text-gray-200" fillColor="#004D90" />
        <span>{label ? `${t(label)}...` : t('please-wait')}</span>
      </div>
    </div>
  );
};

export default LazyFeatureFallback;
