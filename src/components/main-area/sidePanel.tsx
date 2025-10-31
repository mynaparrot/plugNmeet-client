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
      enterFrom="translate-y-full md:translate-x-full"
      enterTo="translate-y-0 md:translate-x-0"
      leave="transition-transform duration-300 ease-in-out"
      leaveFrom="translate-y-0 md:translate-x-0"
      leaveTo="translate-y-full md:translate-x-full"
      afterEnter={() => onToggle?.(true)}
      afterLeave={() => onToggle?.(false)}
    >
      <div
        className={`${panelClass} bottom-0 absolute w-full md:w-[300px] 3xl:w-[340px] right-0 h-[300px] md:h-full`}
      >
        {children}
      </div>
    </Transition>
  );
};

export default SidePanel;
