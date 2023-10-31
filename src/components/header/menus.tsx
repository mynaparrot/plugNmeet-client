import React from 'react';
import { Menu } from '@headlessui/react';
import { store, useAppDispatch } from '../../store';
import {
  updateShowKeyboardShortcutsModal,
  updateShowRoomSettingsModal,
} from '../../store/slices/roomSettingsSlice';
import { useTranslation } from 'react-i18next';

interface IHeaderMenusProps {
  onOpenAlert(task: string): void;
}

const HeaderMenus = ({ onOpenAlert }: IHeaderMenusProps) => {
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
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
      <Menu.Items
        static
        className="HeaderSettingMenu origin-top-right z-10 absolute ltr:right-0 rtl:-left-4 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-darkPrimary ring-1 ring-black dark:ring-secondaryColor ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
      >
        <div className="py-1" role="none">
          <Menu.Item>
            <button
              className="text-gray-700 dark:text-darkText rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => showRoomSettings()}
            >
              <i className="pnm-settings text-primaryColor dark:text-secondaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor dark:group-hover:text-white" />
              {t('header.menus.settings')}
            </button>
          </Menu.Item>
        </div>
        <div className="py-1" role="none">
          <Menu.Item>
            <button
              className="text-gray-700 dark:text-darkText rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => showKeyboardShortcuts()}
            >
              <i className="pnm-keyboard text-primaryColor dark:text-secondaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor dark:group-hover:text-white" />
              {t('header.menus.keyboard-shortcuts')}
            </button>
          </Menu.Item>
        </div>
        <div className="py-1" role="none">
          <Menu.Item>
            <button
              className="text-gray-700 dark:text-darkText rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => logout()}
            >
              <i className="pnm-logout text-primaryColor dark:text-secondaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor dark:group-hover:text-white" />
              {t('header.menus.logout')}
            </button>
          </Menu.Item>
        </div>
        {isAdmin ? (
          <div className="py-1" role="none">
            <Menu.Item>
              <button
                className="text-red-900 dark:text-brandRed rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in"
                onClick={() => endRoom()}
              >
                <i className="pnm-call text-red-900 dark:text-brandRed ltr:mr-2 rtl:ml-2 transition ease-in " />
                {t('header.menus.end')}
              </button>
            </Menu.Item>
          </div>
        ) : null}
      </Menu.Items>
    );
  };
  return <>{render()}</>;
};

export default React.memo(HeaderMenus);
