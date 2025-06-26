import React from 'react';
import { MenuItem } from '@headlessui/react';
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
      <MenuItem>
        {() => (
          <button
            className="text-gray-900 dark:text-dark-text group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primary-color hover:text-white"
            onClick={() => onClick()}
          >
            {t('left-panel.menus.items.private-chat')}
          </button>
        )}
      </MenuItem>
    </div>
  );
};

export default PrivateChatMenuItem;
