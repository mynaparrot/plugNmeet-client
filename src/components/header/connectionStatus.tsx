import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../store';
import { getConnectionQualityColor } from '../../helpers/utils';
import { getMediaServerConn } from '../../helpers/livekit/utils';
import { QualityStats } from '../../helpers/livekit/ConnectionQualityMonitor';
import CopyIcon from '../../assets/Icons/CopyIcon';
import Tooltip from '../../helpers/ui/tooltip';

const ConnectionStatus = () => {
  const { t } = useTranslation();
  const overallQuality = useAppSelector(
    (state) => state.session.overallConnectionQuality,
  );
  const [qualityStats, setQualityStats] = useState<QualityStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const overallColor = useMemo(() => {
    if (!overallQuality) return '#9ca3af';
    return getConnectionQualityColor(overallQuality);
  }, [overallQuality]);

  const handleCopy = useCallback(() => {
    if (!qualityStats) return;
    void navigator.clipboard.writeText(JSON.stringify(qualityStats, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [qualityStats]);

  const fetchStats = useCallback(() => {
    const conn = getMediaServerConn();
    if (conn.qualityMonitor) {
      const stats = conn.qualityMonitor.getStats();
      setQualityStats(stats);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPolling) {
      fetchStats();
      interval = setInterval(fetchStats, 5000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, fetchStats]);

  const renderStat = (
    label: string,
    value: React.ReactNode,
    tooltip?: string,
    color?: string,
  ) => (
    <div className="flex justify-between items-center py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-Gray-800 transition">
      <Tooltip text={tooltip}>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 cursor-help">
          {label}
        </span>
      </Tooltip>

      <div className="flex items-center gap-2">
        {color && (
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-sm font-semibold text-gray-800 dark:text-white">
          {value}
        </span>
      </div>
    </div>
  );

  if (!overallQuality) return null;

  return (
    <Menu as={Fragment}>
      {({ open }) => (
        <div className="relative">
          <MenuButton
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer
              ${
                open
                  ? 'bg-gray-200 dark:bg-Gray-700 scale-105'
                  : 'hover:bg-gray-100 dark:hover:bg-Gray-800'
              }`}
          >
            <i
              style={{ color: overallColor }}
              className="pnm-network text-lg"
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
            afterEnter={() => setIsPolling(true)}
            afterLeave={() => setIsPolling(false)}
          >
            <MenuItems
              className="absolute z-10 mt-2 w-72 right-0 rtl:left-0
              rounded-2xl shadow-2xl p-4
              bg-white dark:bg-dark-primary
              border border-gray-200 dark:border-Gray-700"
            >
              {qualityStats ? (
                <div className="flex flex-col gap-1">
                  {renderStat(
                    t('header.connection-status.overall-quality'),
                    t(
                      `header.connection-status.qualities.${qualityStats.overallQuality}`,
                    ),
                    t('header.connection-status.tooltips.overall-quality'),
                    getConnectionQualityColor(qualityStats.overallQuality),
                  )}

                  {renderStat(
                    t('header.connection-status.upload'),
                    t(
                      `header.connection-status.qualities.${qualityStats.uploadQuality}`,
                    ),
                    t('header.connection-status.tooltips.upload'),
                    getConnectionQualityColor(qualityStats.uploadQuality),
                  )}

                  {renderStat(
                    t('header.connection-status.download'),
                    t(
                      `header.connection-status.qualities.${qualityStats.receiveQuality}`,
                    ),
                    t('header.connection-status.tooltips.download'),
                    getConnectionQualityColor(qualityStats.receiveQuality),
                  )}

                  {renderStat(
                    t('header.connection-status.score'),
                    qualityStats.score.toFixed(2),
                    t('header.connection-status.tooltips.score'),
                  )}

                  {renderStat(
                    t('header.connection-status.packet-loss'),
                    `${qualityStats.rawPacketLoss.toFixed(2)}%`,
                    t('header.connection-status.tooltips.packet-loss'),
                  )}

                  {renderStat(
                    t('header.connection-status.rtt'),
                    `${qualityStats.rtt ? qualityStats.rtt.toFixed(2) : 0} ms`,
                    t('header.connection-status.tooltips.rtt'),
                  )}
                </div>
              ) : null}

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                    ${
                      copied
                        ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 scale-105'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-Gray-700 dark:text-white dark:hover:bg-Gray-600'
                    }`}
                >
                  {copied ? (
                    <>{t('breakout-room.copied')}</>
                  ) : (
                    <>
                      <CopyIcon />
                      {t('header.connection-status.copy')}
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
