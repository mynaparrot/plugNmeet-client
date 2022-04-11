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
  const isAdmin = store.getState().session.currenUser?.metadata?.is_admin;
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
        className="origin-top-right z-10 absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
      >
        <div className="py-1" role="none">
          <Menu.Item>
            <button
              className="text-gray-700 rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => showRoomSettings()}
            >
              <i className="pnm-settings text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
              {t('header.menus.settings')}
            </button>
          </Menu.Item>
        </div>
        <div className="py-1" role="none">
          <Menu.Item>
            <button
              className="text-gray-700 rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => showKeyboardShortcuts()}
            >
              <i className="pnm-keyboard text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
              {t('header.menus.keyboard-shortcuts')}
            </button>
          </Menu.Item>
        </div>
        <div className="py-1" role="none">
          <Menu.Item>
            <button
              className="text-gray-700 rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in hover:text-secondaryColor"
              onClick={() => logout()}
            >
              <i className="pnm-logout text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
              {t('header.menus.logout')}
            </button>
          </Menu.Item>
        </div>
        {isAdmin ? (
          <div className="py-1" role="none">
            <Menu.Item>
              <button
                className="text-red-900 rounded group flex items-center py-2 px-4 text-sm text-left w-full transition ease-in"
                onClick={() => endRoom()}
              >
                <i className="pnm-call text-red-900 mr-2 transition ease-in " />
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
