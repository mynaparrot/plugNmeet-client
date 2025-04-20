import React, { useState, useEffect } from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   Transition,
//   TransitionChild,
// } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { create } from '@bufbuild/protobuf';
import {
  DataMsgBodyType,
  SubmitPollResponseReqSchema,
} from 'plugnmeet-protocol-js';
import { Disclosure } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { PollInfo } from 'plugnmeet-protocol-js';

import {
  useAddResponseMutation,
  useGetPollListsQuery,
} from '../../store/services/pollsApi';
import { store } from '../../store';
import { getNatsConn } from '../../helpers/nats';
import ViewDetails from './viewDetails';

interface IVoteFormProps {
  // onCloseForm(): void;
  pollId: string;
  item: PollInfo;
}

// const VoteForm = ({ onCloseForm, pollId }: IVoteFormProps) => {
const VoteForm = ({ pollId, item }: IVoteFormProps) => {
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const [viewDetails, setViewDetails] = useState<boolean>(false);
  const { t } = useTranslation();
  // const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const conn = getNatsConn();

  const [addResponse, { isLoading, data }] = useAddResponseMutation();
  const { post: poll } = useGetPollListsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      post: data?.polls.find((poll) => poll.id === pollId),
    }),
  });

  useEffect(() => {
    if (!isLoading && data) {
      if (data.status) {
        toast(t('polls.response-added'), {
          type: 'info',
        });
      } else {
        toast(t(data.msg), {
          type: 'error',
        });
      }
      // closeModal();
    }
    //eslint-disable-next-line
  }, [isLoading, data]);

  // const closeModal = () => {
  //   setIsOpen(false);
  //   // onCloseForm();
  // };

  const onSubmit = (e: any) => {
    e.preventDefault();
    if (selectedOption === 0) {
      return;
    }
    addResponse(
      create(SubmitPollResponseReqSchema, {
        pollId: pollId,
        userId: store.getState().session.currentUser?.userId ?? '',
        name: store.getState().session.currentUser?.name ?? '',
        selectedOption: `${selectedOption}`,
      }),
    );

    // notify to everyone
    conn.sendDataMessage(DataMsgBodyType.NEW_POLL_RESPONSE, pollId);
  };

  const renderForm = () => {
    return (
      <form onSubmit={onSubmit} className="group">
        <Disclosure defaultOpen={true} as="div">
          {({ open }) => (
            <>
              <Disclosure.Button className="flex items-center justify-between gap-3 w-full">
                <label className="text-sm text-Gray-800 font-medium block">
                  {poll?.question}
                </label>
                <motion.div
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="group-hover:opacity-100 transition-opacity duration-200"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="rotate-180"
                  >
                    <path
                      d="M11.9999 10L7.99988 6L3.99988 10"
                      stroke="#7493B3"
                      strokeWidth="1.67"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </Disclosure.Button>

              <AnimatePresence>
                {open && (
                  <Disclosure.Panel
                    static
                    as={motion.div}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    // transition={{ duration: 0.2 }}
                    className=""
                  >
                    <div className="relative grid gap-2 mt-2">
                      {poll?.options.map((o) => {
                        return (
                          <div
                            key={o.id}
                            className="relative flex items-center border border-Gray-300 min-h-[38px] bg-white shadow-buttonShadow rounded-xl px-2 overflow-hidden"
                          >
                            <input
                              type="radio"
                              id={`option-${o.id}`}
                              value={o.id}
                              name={`option-${o.id}`}
                              checked={selectedOption === o.id}
                              onChange={(e) =>
                                setSelectedOption(Number(e.currentTarget.value))
                              }
                              className="polls-checkbox relative appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-buttonShadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600"
                            />
                            <label
                              className="text-sm text-Gray-900 absolute w-full h-full pl-7 z-10 flex items-center cursor-pointer"
                              htmlFor={`option-${o.id}`}
                            >
                              {o.text}
                            </label>
                            <div
                              className="shape absolute top-0 left-0 h-full bg-[rgba(0,161,242,0.2)]"
                              style={{ width: '50%' }}
                            ></div>
                          </div>
                        );
                      })}
                      {isLoading ? (
                        <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
                          <div className="lds-ripple">
                            <div className="border-secondaryColor" />
                            <div className="border-secondaryColor" />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="button-section flex items-center justify-end mt-3">
                      <button
                        className="h-7 px-6 leading-[28px] text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg"
                        type="submit"
                      >
                        {t('polls.submit')}
                      </button>
                    </div>
                    <div className="bottom-wrap flex items-center justify-between gap-3 mt-4">
                      <div className="total-vote text-sm text-Gray-700">
                        Total Votes: 42/66
                      </div>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setViewDetails(true)}
                          className="view-details h-8 px-3 bg-Gray-50 rounded-[11px] text-sm text-Gray-800 font-semibold flex items-center hover:bg-Gray-100 transition-all duration-300 cursor-pointer"
                        >
                          {t('polls.view-details')}
                        </button>
                      ) : null}
                    </div>
                  </Disclosure.Panel>
                )}
              </AnimatePresence>
            </>
          )}
        </Disclosure>

        {/* <p className="text-base text-black dark:text-white block mb-2 pb-1 border-b border-solid border-primaryColor/20 dark:border-darkText/20">
            {t('polls.select-option')}
          </p> */}
      </form>
    );
  };

  const renderModal = () => {
    return (
      <>
        {renderForm()}
        <>
          {isAdmin && viewDetails ? (
            <ViewDetails
              onCloseViewDetails={() => setViewDetails(false)}
              pollId={pollId}
              item={item}
            />
          ) : null}
        </>
        {/* <Transition appear show={isOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
          >
            <div className="min-h-screen px-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black opacity-30" />
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
                <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white text-left mb-2"
                  >
                    {t('polls.submit-vote-form-title')}
                  </DialogTitle>
                  <hr />
                  <div className="mt-2">{renderForm()}</div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition> */}
      </>
    );
  };

  return renderModal();
};

export default VoteForm;
