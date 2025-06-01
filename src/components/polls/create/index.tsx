import React, { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';

import { CloseIconSVG } from '../../../assets/Icons/CloseIconSVG';
import FormView from './formView';

export interface CreatePollOptions {
  id: number;
  text: string;
}

const Create = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const renderModal = () => {
    return (
      <>
        <Transition appear show={isOpen} as="div">
          <Dialog
            as="div"
            className="fixed inset-0 z-9999 overflow-y-auto"
            onClose={() => false}
          >
            <div className="min-h-screen px-4 text-center">
              <TransitionChild
                as="div"
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-Gray-950 opacity-70" />
              </TransitionChild>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl">
                  <div className="top flex items-center justify-between py-4 px-6 border-b border-Gray-100">
                    <DialogTitle
                      as="h3"
                      className="text-sm 3xl:text-base font-semibold text-Gray-950"
                    >
                      {t('polls.create')}
                    </DialogTitle>
                    <button
                      className="close-btn text-Gray-500 flex items-center justify-center"
                      type="button"
                      onClick={() => setIsOpen(false)}
                    >
                      <CloseIconSVG />
                    </button>
                  </div>
                  <div className="">
                    <FormView setIsOpen={setIsOpen} />
                  </div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return (
    <>
      {isOpen ? renderModal() : null}
      <div className="button-wrap px-3 3xl:px-5 py-4 border-t border-Gray-200">
        <button
          onClick={() => setIsOpen(true)}
          className="h-10 3xl:h-11 px-5 flex items-center justify-center w-full rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue border border-DarkBlue transition-all duration-300 hover:bg-DarkBlue shadow-button-shadow"
        >
          {t('polls.create')}
        </button>
      </div>
    </>
  );
};

export default Create;
