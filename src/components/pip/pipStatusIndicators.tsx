import React from 'react';
import { useTranslation } from 'react-i18next';

import { ChatIconSVG } from '../../assets/Icons/ChatIconSVG';
import { HandsIconSVG } from '../../assets/Icons/HandsIconSVG';
import { NotifyIconSVG } from '../../assets/Icons/NotifyIconSVG';
import { IPipStatusItem, PipStatusKind } from './pipStatus';

interface IPipStatusIndicatorsProps {
  items: IPipStatusItem[];
}

const STATUS_ICONS: Record<PipStatusKind, React.ReactNode> = {
  chat: <ChatIconSVG />,
  'raised-hand': <HandsIconSVG classes="" />,
  notification: <NotifyIconSVG classes="" />,
};

/**
 * Compact row of count badges shared by the webcam and chat PiP views.
 * It floats over the top-right corner of its positioned container; sizes and
 * colours come from the injected PiP CSS.
 */
const PipStatusIndicators = ({ items }: IPipStatusIndicatorsProps) => {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <div className="pip-status pip-status-overlay" role="status" aria-live="polite">
      {items.map((item) => (
        <span
          key={item.kind}
          className="pip-status-item"
          role="img"
          aria-label={`${t(`pip.status.${item.kind}`)}: ${item.count}`}
        >
          {STATUS_ICONS[item.kind]}
          <span aria-hidden="true">{item.text}</span>
        </span>
      ))}
    </div>
  );
};

export default PipStatusIndicators;
