import React, { Fragment, useMemo, useState } from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../store';
import { ConnectionQuality } from '../../helpers/livekit/ConnectionQualityMonitor';
import CopyIcon from '../../assets/Icons/CopyIcon';

const ConnectionStatus = () => {
  const { t } = useTranslation();
  const qualityStats = useAppSelector((state) => state.session.qualityStats);
  const [copied, setCopied] = useState(false);

  const getColor = (quality: ConnectionQuality) => {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return '#22c55e';
      case ConnectionQuality.Good:
        return '#84cc16';
      case ConnectionQuality.Poor:
        return '#f97316';
      case ConnectionQuality.Lost:
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const overallColor = useMemo(() => {
    if (!qualityStats) return '#9ca3af';
    return getColor(qualityStats.overallQuality);
  }, [qualityStats]);

  const handleCopy = () => {
    if (qualityStats) {
      const data = JSON.stringify(qualityStats, null, 2);
      navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderStat = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-Gray-700 last:border-none">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1">
        {value}
      </span>
    </div>
  );

  const renderDetailedStats = () => {
    if (!qualityStats) return null;

    return (
      <div className="flex flex-col gap-y-1 text-xs px-1">
        {renderStat(
          t('header.connection-status.overall-quality'),
          <i
            style={{ color: overallColor }}
            className="pnm-network text-base cursor-pointer"
          />,
        )}

        {renderStat(
          t('header.connection-status.upload'),
          <i
            style={{ color: getColor(qualityStats.uploadQuality) }}
            className="pnm-network text-base"
          />,
        )}

        {renderStat(
          t('header.connection-status.download'),
          <i
            style={{ color: getColor(qualityStats.receiveQuality) }}
            className="pnm-network text-base"
          />,
        )}

        {renderStat(
          t('header.connection-status.score'),
          qualityStats.score.toFixed(2),
        )}

        {renderStat(
          t('header.connection-status.packet-loss'),
          `${qualityStats.rawPacketLoss.toFixed(2)}%`,
        )}

        {renderStat(
          t('header.connection-status.rtt'),
          `${qualityStats.rtt ?? 0} ms`,
        )}
      </div>
    );
  };

  return (
    <Menu as={Fragment}>
      {({ open }) => (
        <div className="relative">
          <MenuButton
            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all cursor-pointer
              ${
                open
                  ? 'bg-gray-100 dark:bg-Gray-800'
                  : 'hover:bg-gray-100 dark:hover:bg-Gray-800'
              }`}
          >
            <i
              style={{ color: overallColor }}
              className="pnm-network text-base cursor-pointer transition-colors duration-300"
            />
          </MenuButton>

          <Transition
            as={Fragment}
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 scale-95 -translate-y-1"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 -translate-y-1"
          >
            <MenuItems
              unmount={false}
              className="absolute z-10 mt-2 w-64 right-0 rtl:left-0
                rounded-xl shadow-xl p-4
                bg-white dark:bg-dark-primary
                border border-gray-200 dark:border-Gray-700"
            >
              {renderDetailedStats()}
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleCopy}
                  className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${
                      copied
                        ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-Gray-700 dark:text-white dark:hover:bg-Gray-600'
                    }`}
                >
                  {copied ? (
                    <>{t('breakout-room.copied') || 'Copied'}</>
                  ) : (
                    <>
                      <CopyIcon />
                      {t('header.connection-status.copy') || 'Copy'}
                    </>
                  )}
                </button>
              </div>
            </MenuItems>
          </Transition>
        </div>
      )}
    </Menu>
  );
};

export default ConnectionStatus;
