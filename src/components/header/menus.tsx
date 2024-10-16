import React from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch } from '../../store';
import {
  updateShowKeyboardShortcutsModal,
  updateShowRoomSettingsModal,
} from '../../store/slices/roomSettingsSlice';

interface IHeaderMenusProps {
  onOpenAlert(task: string): void;
}

const HeaderMenus = ({ onOpenAlert }: IHeaderMenusProps) => {
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const logout = () => {
    onOpenAlert('logout');
  };
  const endRoom = () => {
    onOpenAlert('end Room');
  };

  const showRoomSettings = () => {
    dispatch(updateShowRoomSettingsModal(true));
  };

  const showKeyboardShortcuts = () => {
    dispatch(updateShowKeyboardShortcutsModal(true));
  };

  const render = () => {
    return (
      <MenuItems
        static
        className="HeaderSettingMenu origin-top-right z-10 absolute ltr:right-0 rtl:-left-4 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-darkPrimary ring-1 ring-black dark:ring-secondaryColor ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
      >
        <div className="py-1" role="none">
          <MenuItem>
            <button
              className="text-gray-700 dark:text-darkText rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => showRoomSettings()}
            >
              <i className="pnm-settings text-primaryColor dark:text-secondaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor dark:group-hover:text-white" />
              {t('header.menus.settings')}
            </button>
          </MenuItem>
        </div>
        <div className="py-1" role="none">
          <MenuItem>
            <button
              className="text-gray-700 dark:text-darkText rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => showKeyboardShortcuts()}
            >
              <i className="pnm-keyboard text-primaryColor dark:text-secondaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor dark:group-hover:text-white" />
              {t('header.menus.keyboard-shortcuts')}
            </button>
          </MenuItem>
        </div>
        <div className="py-1" role="none">
          <MenuItem>
            <button
              className="text-gray-700 dark:text-darkText rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => logout()}
            >
              <i className="pnm-logout text-primaryColor dark:text-secondaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor dark:group-hover:text-white" />
              {t('header.menus.logout')}
            </button>
          </MenuItem>
        </div>
        {isAdmin ? (
          <div className="py-1" role="none">
            <MenuItem>
              <button
                className="text-red-900 dark:text-brandRed rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in"
                onClick={() => endRoom()}
              >
                <i className="pnm-call text-red-900 dark:text-brandRed ltr:mr-2 rtl:ml-2 transition ease-in " />
                {t('header.menus.end')}
              </button>
            </MenuItem>
          </div>
        ) : null}
      </MenuItems>
    );
  };
  return <>{render()}</>;
};

export default React.memo(HeaderMenus);
