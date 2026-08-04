import React from 'react';
import { MenuItem } from '@headlessui/react';
import clsx from 'clsx';

interface IMenuItemHelperProps {
  onClick: () => void;
  icon: React.ReactNode;
  text: React.ReactNode;
  isActive?: boolean;
  customClass?: string;
}

const MenuItemHelper = ({
  onClick,
  icon,
  text,
  isActive,
  customClass,
}: IMenuItemHelperProps) => {
  return (
    <MenuItem>
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden',
          customClass,
        )}
      >
        <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
          {icon}
        </span>
        {text}
        {isActive && (
          <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
        )}
      </button>
    </MenuItem>
  );
};

export default MenuItemHelper;
