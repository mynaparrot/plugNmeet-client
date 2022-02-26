import React from 'react';
import { Menu } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

interface IRemoveUserMenuItemProps {
  userId: string;
  onOpenAlert(userId: string): void;
}

const RemoveUserMenuItem = ({
  userId,
  onOpenAlert,
}: IRemoveUserMenuItemProps) => {
  const { t } = useTranslation();

  const onClose = () => {
    onOpenAlert(userId);
  };

  const render = () => {
    return (
      <React.Fragment>
        <div className="" role="none">
          <Menu.Item onClick={() => onClose()}>
            {() => (
              <button className="text-red-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-red-400 hover:text-white">
                {t('left-panel.menus.items.remove-participant')}
              </button>
            )}
          </Menu.Item>
        </div>
      </React.Fragment>
    );
  };
  return <React.Fragment>{render()}</React.Fragment>;
};

export default RemoveUserMenuItem;
