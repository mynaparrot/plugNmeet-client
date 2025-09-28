import React, { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';

import EndPollBtn from './endPollBtn';
import PublishResultBtn from './publishResultBtn';
import NotRespondents from './notRespondents';
import Respondents from './respondents';
import { PollDataWithOption } from '../../utils';
import { CloseIconSVG } from '../../../../assets/Icons/CloseIconSVG';

interface ViewDetailsProps {
  pollDataWithOption: PollDataWithOption;
  isRunning: boolean;
  onCloseViewDetails: () => void;
  serialNum: number;
}

const DetailsModal = ({
  pollDataWithOption,
  isRunning,
  onCloseViewDetails,
  serialNum,
}: ViewDetailsProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { t } = useTranslation();

  const closeModal = () => {
    setIsOpen(false);
    onCloseViewDetails();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-9999 overflow-y-auto"
        onClose={closeModal}
      >
        <div className="min-h-screen px-4 text-center bg-Gray-950/70 flex items-center justify-center">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl">
              <div className="top flex items-center justify-between py-4 px-6">
                <DialogTitle
                  as="h3"
                  className="text-sm 3xl:text-base font-semibold text-Gray-950 flex items-center gap-3"
                >
                  <span className="uppercase">
                    {t('polls.poll-num', { index: serialNum })}
                  </span>{' '}
                  {!isRunning && (
                    <div className="border border-Red-200 bg-Red-100 shadow-button-shadow rounded-full h-[22px] px-1.5 text-xs text-Red-700 font-medium flex items-center">
                      {t('polls.poll-closed')}
                    </div>
                  )}
                </DialogTitle>
                <button
                  className="close-btn text-Gray-500 flex items-center justify-center cursor-pointer"
                  type="button"
                  onClick={closeModal}
                >
                  <CloseIconSVG />
                </button>
              </div>
              <div className="q-headline px-5 py-3 border border-Gray-100 bg-Gray-25 text-sm font-medium text-Gray-800">
                <p className="">Q: {pollDataWithOption.question}</p>
              </div>
              <Respondents pollDataWithOption={pollDataWithOption} />
              <div className="line h-1 w-full bg-Gray-50"></div>
              <NotRespondents pollDataWithOption={pollDataWithOption} />
              <div className="px-5 py-5 flex justify-end bg-Gray-25 border-t border-Gray-100">
                {isRunning ? (
                  <EndPollBtn pollId={pollDataWithOption.pollId} />
                ) : (
                  <PublishResultBtn
                    onCloseViewDetails={onCloseViewDetails}
                    pollDataWithOption={pollDataWithOption}
                  />
                )}
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DetailsModal;
