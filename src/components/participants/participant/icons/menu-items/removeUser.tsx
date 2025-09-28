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
          className="text-red-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-red-400 hover:text-white"
          onClick={() => onOpenAlert(userId, 'remove')}
        >
          {t('left-panel.menus.items.remove-participant')}
        </button>
      )}
    </MenuItem>
  );
};

export default RemoveUserMenuItem;
