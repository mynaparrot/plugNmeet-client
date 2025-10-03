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
          className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-Red-600 px-3 rounded-lg transition-all duration-300 hover:bg-Red-600 hover:text-white"
          onClick={() => onOpenAlert(userId, 'remove')}
        >
          {t('left-panel.menus.items.remove-participant')}
        </button>
      )}
    </MenuItem>
  );
};

export default RemoveUserMenuItem;
