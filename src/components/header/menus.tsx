import React from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import {
  updateShowKeyboardShortcutsModal,
  updateShowRoomSettingsModal,
} from '../../store/slices/roomSettingsSlice';

interface IHeaderMenusProps {
  onOpenAlert(task: string): void;
}

const HeaderMenus = ({ onOpenAlert }: IHeaderMenusProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isBreakoutRoom = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.isBreakoutRoom,
  );

  return (
    <MenuItems
      unmount={false}
      anchor="bottom end"
      transition
      className="HeaderSettingMenu z-50 bg-white dark:bg-dark-primary w-[244px] shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 dark:border-Gray-700 p-2 ring-0 focus:outline-hidden focus-ring [--anchor-gap:8px] transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
    >
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
