import React, { useMemo, useState } from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import {
  updateShowKeyboardShortcutsModal,
  updateShowRoomSettingsModal,
} from '../../store/slices/roomSettingsSlice';
import { getConnectionQualityColor } from '../../helpers/utils';
import { ConnectionStatusPanel } from './connectionStatus';

interface IHeaderMenusProps {
  onOpenAlert(task: string): void;
}

const HeaderMenus = ({ onOpenAlert }: IHeaderMenusProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isBreakoutRoom = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.isBreakoutRoom,
  );

  const [showConnectionStats, setShowConnectionStats] = useState(false);
  const overallQuality = useAppSelector(
    (state) => state.session.overallConnectionQuality,
  );
  const overallColor = useMemo(() => {
    if (!overallQuality) return '#9ca3af';
    return getConnectionQualityColor(overallQuality);
  }, [overallQuality]);

  return (
    <MenuItems
      unmount={false}
      anchor="bottom end"
      transition
      className="HeaderSettingMenu z-50 bg-white dark:bg-dark-primary w-[244px] shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 dark:border-Gray-700 p-2 ring-0 focus:outline-hidden focus-ring [--anchor-gap:8px] transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
    >
      {/* Mobile-only: connection status row that expands the stats panel inline */}
      <MenuItem disabled={true}>
        <div className="md:hidden">
          <button
            type="button"
            aria-expanded={showConnectionStats}
            className="h-9 w-full cursor-pointer flex items-center hover:bg-Gray-50 dark:hover:bg-dark-secondary2 text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 md:px-3 rounded-lg transition-all duration-300 relative"
            onClick={() => setShowConnectionStats(!showConnectionStats)}
          >
            <i
              style={{ color: overallColor }}
              className="pnm-network text-primary-color dark:text-Blue2-500 text-base me-2 transition ease-in"
            />
            <span className="flex-1 text-left">
              {overallQuality
                ? t(`header.connection-status.qualities.${overallQuality}`)
                : t('header.connection-status.title')}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-3 w-3 text-Gray-500 transition-transform duration-300 ${
                showConnectionStats ? 'rotate-180' : ''
              }`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showConnectionStats && (
            <>
              <div className="px-2 py-2">
                <ConnectionStatusPanel />
              </div>
              <div className="border-t border-Gray-100 dark:border-Gray-700 my-1" />
            </>
          )}
        </div>
      </MenuItem>
      <MenuItem>
        <button
          type="button"
          className="h-9 md:h-10 w-full cursor-pointer flex items-center hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 md:px-3 rounded-lg transition-all duration-300 relative"
          onClick={() => dispatch(updateShowRoomSettingsModal(true))}
        >
          <i className="pnm-settings text-primary-color dark:text-Blue2-500 text-base me-2 transition ease-in" />
          {t('header.menus.settings')}
        </button>
      </MenuItem>

      <MenuItem>
        <button
          type="button"
          className="h-9 md:h-10 w-full cursor-pointer flex items-center hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 md:px-3 rounded-lg transition-all duration-300 relative"
          onClick={() => dispatch(updateShowKeyboardShortcutsModal(true))}
        >
          <i className="pnm-keyboard text-primary-color dark:text-Blue2-500 text-lg me-2 transition ease-in" />
          {t('header.menus.keyboard-shortcuts')}
        </button>
      </MenuItem>

      {!isBreakoutRoom && (
        <MenuItem>
          <button
            type="button"
            className="h-9 md:h-10 w-full cursor-pointer flex items-center hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 md:px-3 rounded-lg transition-all duration-300 relative"
            onClick={() => onOpenAlert('logout')}
          >
            <i className="pnm-logout text-primary-color dark:text-Blue2-500 text-lg me-2 transition ease-in" />
            {t('header.menus.logout')}
          </button>
        </MenuItem>
      )}
    </MenuItems>
  );
};

export default HeaderMenus;
