import React from 'react';
import { Menu } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch } from '../../../../../store';
import {
  updateInitiatePrivateChat,
  updateSelectedChatOption,
} from '../../../../../store/slices/roomSettingsSlice';
import { updateIsActiveChatPanel } from '../../../../../store/slices/bottomIconsActivitySlice';

interface IChatMenuItemProps {
  userId: string;
  name: string;
}
const PrivateChatMenuItem = ({ name, userId }: IChatMenuItemProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const onClick = () => {
    dispatch(updateIsActiveChatPanel(true));
    dispatch(
      updateInitiatePrivateChat({
        name,
        userId,
      }),
    );
    dispatch(updateSelectedChatOption(userId));
  };
  return (
    <div className="" role="none">
      <Menu.Item>
        {() => (
          <button
            className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
            onClick={() => onClick()}
          >
            {t('left-panel.menus.items.private-chat')}
          </button>
        )}
      </Menu.Item>
    </div>
  );
};

export default PrivateChatMenuItem;
