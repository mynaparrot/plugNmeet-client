import React, { ReactNode } from 'react';
import { Transition } from '@headlessui/react';

interface SidePanelProps {
  isActive: boolean;
  panelClass: string;
  children: ReactNode;
  onToggle?: (isOpen: boolean) => void;
}

const SidePanel = ({
  isActive,
  panelClass,
  children,
  onToggle,
}: SidePanelProps) => {
  return (
    <Transition
      show={isActive}
      enter="transition-transform duration-300 ease-in-out"
      enterFrom="translate-x-full"
      enterTo="translate-x-0"
      leave="transition-transform duration-300 ease-in-out"
      leaveFrom="translate-x-0"
      leaveTo="translate-x-full"
      afterEnter={() => onToggle?.(true)}
      afterLeave={() => onToggle?.(false)}
    >
      <div
        className={`${panelClass} absolute w-[300px] 3xl:w-[340px] right-0 h-full`}
      >
        {children}
      </div>
    </Transition>
  );
};

export default SidePanel;
