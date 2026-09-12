import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';
import { getConnectionQualityColor } from '../../../../helpers/utils';

interface IConnectionStatusProps {
  userId: string;
  name?: string;
}
const ConnectionStatus = ({ userId, name }: IConnectionStatusProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const connectionQuality = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.connectionQuality,
  );

  const { color, label } = useMemo(() => {
    const color = getConnectionQualityColor(connectionQuality);
    const label = connectionQuality
      ? t(`header.connection-status.qualities.${connectionQuality}`)
      : t('header.connection-status.title');
    return { color, label };
  }, [connectionQuality, t]);

  return (
    <div className="relative">
      <button
        type="button"
        className="connection-status cursor-pointer w-7 h-7 rounded-full bg-Gray-950/50 shadow-shadowXS flex items-center justify-center focus-ring"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        title={t('header.connection-status.title')}
        aria-label={`${t('header.connection-status.title')}: ${label}${name ? ` — ${name}` : ''}`}
        aria-expanded={open}
      >
        <i style={{ color: color }} className="pnm-network text-[7px]" />
      </button>
      {open && (
        <div
          role="status"
          className="absolute z-1000 top-full mt-1 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 whitespace-nowrap rounded-md bg-Gray-950/90 px-2 py-1 text-xs text-white shadow-md pointer-events-none"
        >
          <span style={{ color: color }}>●</span> {label}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
