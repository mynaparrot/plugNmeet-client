import React, { Fragment } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

interface IConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text: string;
}

const ConfirmationModal = ({
  show,
  onClose,
  onConfirm,
  title,
  text,
}: IConfirmationModalProps) => {
  const { t } = useTranslation();

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        as="div"
        className="ConfirmationModal fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
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
            <div className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out">
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
              >
                <span>{title}</span>
                <Button className="cursor-pointer" onClick={onClose}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <hr />
              <div className="mt-4">
                <p className="text-sm text-Gray-900">{text}</p>
              </div>

              <div className="mt-8 flex items-center justify-end gap-2">
                <button
                  className="h-10 px-5 w-32 flex items-center justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow cursor-pointer"
                  onClick={onConfirm}
                >
                  {t('ok')}
                </button>
                <button
                  type="button"
                  className="h-10 px-5 w-32 flex items-center justify-center text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer"
                  onClick={onClose}
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmationModal;
