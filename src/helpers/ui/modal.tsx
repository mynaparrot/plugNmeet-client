import React, { Fragment, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import clsx from 'clsx';

import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

interface IModalProps {
  show: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  customClass?: string;
  customBodyClass?: string;
  renderButtons?: () => React.ReactNode;
  unmount?: boolean;
}

const Modal = ({
  show,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  customClass,
  customBodyClass,
  renderButtons,
  unmount,
}: IModalProps) => {
  const [isOpen, setIsOpen] = useState(show);

  useEffect(() => {
    setIsOpen(show);
  }, [show]);

  return (
    <Transition appear show={isOpen} as={Fragment} afterLeave={onClose}>
      <Dialog
        as="div"
        className="relative z-50 focus:outline-hidden"
        onClose={() => false}
        unmount={unmount}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-Gray-950/70 dark:bg-Gray-950/30" />
        </TransitionChild>

        <div className="fixed inset-0 flex w-screen justify-center p-4 scrollBar">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel
              className={clsx(
                'w-full bg-white dark:bg-dark-primary border border-Gray-200 dark:border-Gray-800 shadow-virtualPOP rounded-xl m-auto',
                maxWidth,
                customClass,
              )}
            >
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-sm md:text-base font-semibold leading-7 text-Gray-950 dark:text-white px-4 py-2 border-b border-Gray-100 dark:border-Gray-800"
              >
                <span>{title}</span>
                <Button
                  className="cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div
                className={clsx(
                  'p-4 bg-Gray-25 dark:bg-dark-primary rounded-b-xl',
                  customBodyClass,
                )}
              >
                {children}
              </div>
              {renderButtons && (
                <div className="px-4 py-4 border-t border-Gray-100 dark:border-Gray-800 flex justify-end">
                  {renderButtons()}
                </div>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
