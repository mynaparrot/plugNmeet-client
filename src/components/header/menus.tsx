import React from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch } from '../../store';
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

  return (
    <MenuItems
      static
      className="HeaderSettingMenu origin-top-right z-50 bg-white absolute ltr:right-0 rtl:-left-4 mt-2 w-[244px] shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2 ring-0 focus:outline-hidden"
    >
      <MenuItem>
        <button
          className="h-10 3xl:h-11 w-full cursor-pointer flex items-center bg-white hover:bg-Gray-50 text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
          onClick={() => dispatch(updateShowRoomSettingsModal(true))}
        >
          <i className="pnm-settings text-primary-color text-base ltr:mr-2 rtl:ml-2 transition ease-in" />
          {t('header.menus.settings')}
        </button>
      </MenuItem>

      <MenuItem>
        <button
          className="h-10 3xl:h-11 w-full cursor-pointer flex items-center bg-white hover:bg-Gray-50 text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
          onClick={() => dispatch(updateShowKeyboardShortcutsModal(true))}
        >
          <i className="pnm-keyboard text-primary-color text-lg ltr:mr-2 rtl:ml-2 transition ease-in" />
          {t('header.menus.keyboard-shortcuts')}
        </button>
      </MenuItem>

      <MenuItem>
        <button
          className="h-10 3xl:h-11 w-full cursor-pointer flex items-center bg-white hover:bg-Gray-50 text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
          onClick={() => onOpenAlert('logout')}
        >
          <i className="pnm-logout text-primary-color text-lg ltr:mr-2 rtl:ml-2 transition ease-in" />
          {t('header.menus.logout')}
        </button>
      </MenuItem>
    </MenuItems>
  );
};

export default React.memo(HeaderMenus);
