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

  const initiatePrivateChat = () => {
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
            className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50"
            onClick={initiatePrivateChat}
          >
            {t('left-panel.menus.items.private-chat')}
          </button>
        )}
      </MenuItem>
    </div>
  );
};

export default PrivateChatMenuItem;
