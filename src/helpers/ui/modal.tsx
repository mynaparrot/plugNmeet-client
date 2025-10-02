import React, { Fragment } from 'react';
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
  renderButtons?: () => React.ReactNode;
}

const Modal = ({
  show,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  customClass,
  renderButtons,
}: IModalProps) => {
  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        as="div"
        className="Modal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
        onClose={onClose}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel
              className={clsx(
                'w-full bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out',
                maxWidth,
                customClass, // Keep for other customizations
              )}
            >
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-lg font-semibold leading-7 text-Gray-950 mb-2"
              >
                <span>{title}</span>
                <Button className="cursor-pointer" onClick={onClose}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <hr />
              <div className="mt-5">{children}</div>
              {renderButtons && (
                <div className="mt-8 flex justify-end">{renderButtons()}</div>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
