import React, { Fragment, useEffect, useRef, useState } from 'react';
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
  closeOnEscape?: boolean;
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
  closeOnEscape,
}: IModalProps) => {
  const [isOpen, setIsOpen] = useState(show);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Delay auto-focus until after the 300ms enter transition completes to
      // avoid a visual jump glitch where focus fires mid-transition.
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(show);
  }, [show]);

  // Opt-in Escape handling. The default stays off so existing dialogs keep
  // their current close-button-only behavior.
  useEffect(() => {
    if (!isOpen || !closeOnEscape) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      // Mark handled so HeadlessUI's Dialog doesn't also process the event.
      event.preventDefault();
      setIsOpen(false);
    };
    // Capture phase so this runs before HeadlessUI's bubble-phase handler.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, closeOnEscape]);

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
          <div className="fixed inset-0 bg-Gray-950/70 dark:bg-Gray-950/80" />
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
                  ref={closeButtonRef}
                  data-autofocus
                  className="cursor-pointer focus-ring"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  <PopupCloseSVGIcon classes="text-Gray-600 dark:text-white" />
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
