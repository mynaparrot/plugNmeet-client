import React from 'react';
import { LoadingIcon } from '../../assets/Icons/Loading';
import clsx from 'clsx';

interface IActionButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  buttonType?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  children: React.ReactNode;
  custom?: string;
}

const ActionButton = ({
  onClick,
  isLoading = false,
  buttonType = 'submit',
  disabled = false,
  children,
  custom,
}: IActionButtonProps) => {
  return (
    <button
      type={buttonType}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={clsx(
        'h-9 w-36 flex items-center justify-center cursor-pointer text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50',
        custom,
      )}
    >
      {isLoading ? (
        <LoadingIcon
          className="inline h-5 w-5 animate-spin text-white"
          fillColor="currentColor"
        />
      ) : (
        children
      )}
    </button>
  );
};

export default ActionButton;
