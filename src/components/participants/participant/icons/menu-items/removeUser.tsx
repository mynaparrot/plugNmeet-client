import React from 'react';
import { MenuItem } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

interface IRemoveUserMenuItemProps {
  userId: string;
  onOpenAlert(userId: string, type: string): void;
}

const RemoveUserMenuItem = ({
  userId,
  onOpenAlert,
}: IRemoveUserMenuItemProps) => {
  const { t } = useTranslation();

  return (
    <MenuItem>
      {() => (
        <button
          className="text-Red-400 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs font-medium transition ease-in hover:bg-Red-600 hover:text-white"
          onClick={() => onOpenAlert(userId, 'remove')}
        >
          {t('left-panel.menus.items.remove-participant')}
        </button>
      )}
    </MenuItem>
  );
};

export default RemoveUserMenuItem;
