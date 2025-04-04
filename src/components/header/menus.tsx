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
        className="HeaderSettingMenu origin-top-right z-10 absolute ltr:right-0 rtl:-left-4 mt-2 w-[244px] shadow-dropdownMenu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2 ring-0 focus:outline-none"
      >
        <div className="py-1" role="none">
          <MenuItem>
            <button
              className="h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
              onClick={() => showRoomSettings()}
            >
              <i className="pnm-settings text-primaryColor text-base ltr:mr-2 rtl:ml-2 transition ease-in" />
              {t('header.menus.settings')}
            </button>
          </MenuItem>
        </div>
        <div className="py-1" role="none">
          <MenuItem>
            <button
              className="h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
              onClick={() => showKeyboardShortcuts()}
            >
              <i className="pnm-keyboard text-primaryColor text-lg ltr:mr-2 rtl:ml-2 transition ease-in" />
              {t('header.menus.keyboard-shortcuts')}
            </button>
          </MenuItem>
        </div>
        <div className="py-1" role="none">
          <MenuItem>
            <button
              className="h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
              onClick={() => logout()}
            >
              <i className="pnm-logout text-primaryColor text-lg ltr:mr-2 rtl:ml-2 transition ease-in" />
              {t('header.menus.logout')}
            </button>
          </MenuItem>
        </div>
        {isAdmin ? (
          <MenuItem>
            <button
              className="h-10 w-full 3xl:h-11 px-5 flex items-center rounded-lg text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
              onClick={() => endRoom()}
            >
              <i className="pnm-call text-white ltr:mr-2 rtl:ml-2 transition ease-in " />
              {t('header.menus.end')}
            </button>
          </MenuItem>
        ) : null}
      </MenuItems>
    );
  };
  return <>{render()}</>;
};

export default React.memo(HeaderMenus);
