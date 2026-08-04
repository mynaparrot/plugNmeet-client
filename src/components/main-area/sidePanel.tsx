import React, { ReactNode } from 'react';
import { Transition } from '@headlessui/react';

interface SidePanelProps {
  isActive: boolean;
  panelClass: string;
  children: ReactNode;
  onToggle: (isOpen: boolean) => void;
  ariaLabel: string;
}

const SidePanel = ({
  isActive,
  panelClass,
  children,
  onToggle,
  ariaLabel,
}: SidePanelProps) => {
  return (
    <Transition
      show={isActive}
      enter="transform transition ease-in-out duration-300"
      enterFrom="translate-y-full md:translate-y-0 md:ltr:translate-x-full md:rtl:-translate-x-full"
      enterTo="translate-y-0 md:translate-x-0"
      leave="transform transition ease-in-out duration-300"
      leaveFrom="translate-y-0 md:translate-x-0"
      leaveTo="translate-y-full md:translate-y-0 md:ltr:translate-x-full md:rtl:-translate-x-full"
      afterEnter={() => onToggle(true)}
      afterLeave={() => onToggle(false)}
    >
      <div
        className={`${panelClass} bottom-0 absolute w-full md:w-[300px] 3xl:w-[340px] end-0 h-[300px] md:h-full`}
        role="complementary"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </Transition>
  );
};

export default SidePanel;
