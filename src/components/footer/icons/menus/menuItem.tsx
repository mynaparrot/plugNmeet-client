import React from 'react';
import { MenuItem } from '@headlessui/react';

interface IAdminMenuItemProps {
  onClick: () => void;
  icon: React.ReactNode;
  text: React.ReactNode;
  isActive?: boolean;
}

const FooterMenuItem = ({
  onClick,
  icon,
  text,
  isActive,
}: IAdminMenuItemProps) => {
  return (
    <MenuItem>
      <button
        onClick={onClick}
        className="h-10 3xl:h-11 w-full cursor-pointer flex items-center bg-white hover:bg-Gray-50 text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
      >
        <span className="icon flex w-6 h-auto justify-center text-Blue2-700">
          {icon}
        </span>
        {text}
        {isActive && (
          <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 absolute top-1/2 -translate-y-1/2 right-3" />
        )}
      </button>
    </MenuItem>
  );
};

export default FooterMenuItem;
