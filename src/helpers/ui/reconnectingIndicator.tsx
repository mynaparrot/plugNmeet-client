import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface IReconnectingIndicatorProps {
  showLabel?: boolean;
}

const ReconnectingIndicator = ({ showLabel }: IReconnectingIndicatorProps) => {
  const { t } = useTranslation();
  const label = t('reconnecting');

  return (
    <span
      title={label}
      className={clsx(
        'reconnecting-fade-in inline-flex items-center gap-1',
        showLabel && 'rounded-full bg-Gray-950/50 px-2 py-1',
      )}
    >
      <span className="block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent dark:border-amber-400 dark:border-t-transparent" />
      {showLabel && <span className="whitespace-nowrap text-xs font-medium">{label}</span>}
    </span>
  );
};

export default ReconnectingIndicator;
