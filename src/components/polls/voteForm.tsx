import React, { useState, useEffect, useMemo } from 'react';
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
  useGetPollResponsesDetailsQuery,
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

  const { data: pollResponses } = useGetPollResponsesDetailsQuery(pollId);

  const respondents = useMemo(() => {
    const obj = {};
    if (
      pollResponses?.responses.all_respondents &&
      pollResponses?.responses.all_respondents !== ''
    ) {
      const respondents: Array<string> = JSON.parse(
        pollResponses?.responses.all_respondents,
      );
      respondents.forEach((r) => {
        const data = r.split(':');
        if (typeof obj[data[1]] === 'undefined') {
          obj[data[1]] = [];
        }
        obj[data[1]].push(data[2]);
      });
    }

    return obj;
  }, [pollResponses]);

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

  // const getOptSelectedCount = (id) => {
  //   if (typeof pollResponses?.responses[id + '_count'] !== 'undefined') {
  //     return pollResponses?.responses[id + '_count'];
  //   } else {
  //     return 0;
  //   }
  // };
  // const getRespondentsById = (id) => {
  //   if (typeof respondents[id] !== 'undefined') {
  //     return respondents[id].map((r, i) => {
  //       return (
  //         <p className="px-[14px] text-xs font-medium text-Gray-800" key={i}>
  //           {r}
  //         </p>
  //       );
  //     });
  //   }

  //   return null;
  // };

  const getRespondentsById = (id) => {
    if (typeof respondents[id] !== 'undefined') {
      return respondents[id].map((r, i) => {
        const parts = r.trim().split(/\s+/);
        const firstNameInitial = parts[0]?.[0] || '';
        const lastNameInitial = parts[parts.length - 1]?.[0] || '';
        const initials = `${firstNameInitial}${lastNameInitial}`.toUpperCase();

        return (
          <>
            <p
              className="text-xs font-medium text-Gray-800 w-max flex items-center gap-1"
              key={i}
            >
              <span className="w-[18px] h-[18px] rounded-md bg-Blue2-700 flex items-center justify-center text-white text-[8px] font-medium">
                {initials}
              </span>{' '}
              {r}
            </p>
            <p className="line text-Gray-300 text-xs font-medium last:hidden">
              |
            </p>
          </>
        );
      });
    }
    return null;
  };
  const renderOptions = () => {
    return item?.options.map((o) => {
      return (
        // <div className="">
        <Disclosure as="div" key={o.id}>
          {({ open }) => (
            <div className="bg-Gray-50 rounded-xl border border-gray-300">
              <Disclosure.Button
                // className={`flex items-center justify-between gap-3 w-full px-[14px] bg-white h-9 rounded-xl  shadow-buttonShadow transition-all duration-300 ${open ? 'border-b border-gray-300' : ''}`}
                className={`w-full relative h-full`}
              >
                {/* <span className="text-sm text-Gray-800">
                    {o.text} ({getOptSelectedCount(o.id)})
                  </span> */}
                <div
                  key={o.id}
                  className={`relative pointer-events-none flex items-center min-h-[38px] bg-white shadow-buttonShadow rounded-xl px-2 overflow-hidden ${open ? 'border-b border-gray-300' : ''}`}
                >
                  <input
                    type="radio"
                    id={`option-${o.id}`}
                    value={o.id}
                    name={`option-${o.id}`}
                    checked={selectedOption === o.id}
                    // onChange={(e) =>
                    //   setSelectedOption(Number(e.currentTarget.value))
                    // }
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
                <motion.div
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-2 top-2.5"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="17"
                    viewBox="0 0 16 17"
                    fill="none"
                  >
                    <path d="M12 6.5L8 10.5L4 6.5" fill="#7493B3" />
                    <path
                      d="M12 6.5L8 10.5L4 6.5H12Z"
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
                    className=" w-full"
                  >
                    <div className="overflow-auto w-[263px] px-2.5">
                      <div className="wrap flex gap-2 py-2 relative w-max group">
                        {getRespondentsById(o.id)}
                      </div>
                    </div>
                  </Disclosure.Panel>
                )}
              </AnimatePresence>
            </div>
          )}
        </Disclosure>
        // </div>
      );
    });
  };

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

  console.log('poll', item);

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
                    {item.isRunning ? (
                      <>
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
                                    setSelectedOption(
                                      Number(e.currentTarget.value),
                                    )
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
                            className="h-8 px-5 flex items-center justify-center w-full rounded-[10px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue border border-DarkBlue transition-all duration-300 hover:bg-DarkBlue shadow-buttonShadow"
                            type="submit"
                          >
                            {t('polls.submit')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="relative grid gap-2 mt-2">
                        {renderOptions()}
                      </div>
                    )}
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
