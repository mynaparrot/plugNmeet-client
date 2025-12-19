import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';

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

  const renderButtons = () => (
    <div className="flex items-center justify-end gap-2">
      <button
        className="h-10 px-5 w-32 flex items-center justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow cursor-pointer"
        onClick={onConfirm}
      >
        {t('ok')}
      </button>
      <button
        type="button"
        className="primary-button h-10 px-5 w-32 flex items-center justify-center text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer"
        onClick={onClose}
      >
        {t('close')}
      </button>
    </div>
  );

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={title}
      renderButtons={renderButtons}
    >
      <p className="text-sm text-Gray-900 dark:text-white">{text}</p>
    </Modal>
  );
};

export default ConfirmationModal;
