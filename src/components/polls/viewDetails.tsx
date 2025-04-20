import React, { Fragment, useEffect, useMemo, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  Disclosure,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { toast } from 'react-toastify';
import { ClosePollReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';
import {
  useClosePollMutation,
  useGetPollListsQuery,
  useGetPollResponsesDetailsQuery,
} from '../../store/services/pollsApi';
import { getNatsConn } from '../../helpers/nats';
import { DialogTitle } from '@headlessui/react';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';
import { PollInfo } from 'plugnmeet-protocol-js';
import { motion, AnimatePresence } from 'framer-motion';

interface IViewDetailsProps {
  onCloseViewDetails(): void;
  pollId: string;
  item: PollInfo;
}

const ViewDetails = ({
  pollId,
  item,
  onCloseViewDetails,
}: IViewDetailsProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { t } = useTranslation();
  const conn = getNatsConn();
  const { post: poll } = useGetPollListsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      post: data?.polls.find((poll) => poll.id === pollId),
    }),
  });
  const { data: pollResponses } = useGetPollResponsesDetailsQuery(pollId);
  const [closePoll, { isLoading, data: closePollRes }] = useClosePollMutation();

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
    if (!isLoading && closePollRes) {
      if (closePollRes.status) {
        toast(t('polls.end-poll-success'), {
          type: 'info',
        });
      } else {
        toast(t(closePollRes.msg), {
          type: 'error',
        });
      }
    }
    //eslint-disable-next-line
  }, [isLoading, closePollRes]);

  const closeModal = () => {
    setIsOpen(false);
    onCloseViewDetails();
  };

  const endPoll = () => {
    closePoll(
      create(ClosePollReqSchema, {
        pollId: pollId,
      }),
    );
  };

  const getOptSelectedCount = (id) => {
    if (typeof pollResponses?.responses[id + '_count'] !== 'undefined') {
      return pollResponses?.responses[id + '_count'];
    } else {
      return 0;
    }
  };

  const getRespondentsById = (id) => {
    if (typeof respondents[id] !== 'undefined') {
      return respondents[id].map((r, i) => {
        return (
          <p className="px-[14px] text-xs font-medium text-Gray-800" key={i}>
            {r}
          </p>
        );
      });
    }

    return null;
  };

  const renderOptions = () => {
    return poll?.options.map((o) => {
      return (
        <div className="" key={o.id}>
          <Disclosure as="div">
            {({ open }) => (
              <div className="bg-Gray-50 rounded-xl border border-gray-300">
                <Disclosure.Button
                  className={`flex items-center justify-between gap-3 w-full px-[14px] bg-white h-9 rounded-xl  shadow-buttonShadow transition-all duration-300 ${open ? 'border-b border-gray-300' : ''}`}
                >
                  <span className="text-sm text-Gray-800">
                    {o.text} ({getOptSelectedCount(o.id)})
                  </span>
                  <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className=""
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
                      className=""
                    >
                      <div className="wrap grid grid-cols-4 gap-2 py-2 relative">
                        {getRespondentsById(o.id)}
                        <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-1/4"></div>
                        <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-1/2"></div>
                        <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-3/4"></div>
                      </div>
                    </Disclosure.Panel>
                  )}
                </AnimatePresence>
              </div>
            )}
          </Disclosure>
        </div>
      );
    });
  };

  const publishPollResultByChat = async () => {
    if (isLoading) {
      return;
    }
    const totalRes: any = pollResponses?.responses['total_resp'] ?? '0';
    const elm = ReactDOMServer.renderToString(
      <>
        <p>{poll?.question}</p>
        <p>
          {t('polls.total-responses', {
            count: totalRes,
          })}
        </p>
        {poll?.options.map((o) => {
          return <p key={o.id}>{`${o.text} (${getOptSelectedCount(o.id)})`}</p>;
        })}
      </>,
    );
    await conn.sendChatMsg('public', elm);
    closeModal();
  };

  const renderModal = () => {
    return (
      <>
        <Transition appear show={isOpen} as={Fragment}>
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
                <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl">
                  <div className="top flex items-center justify-between py-4 px-6">
                    <DialogTitle
                      as="h3"
                      className="text-sm 3xl:text-base font-semibold text-Gray-950 flex items-center gap-3"
                    >
                      {/* <span>{t('polls.view-details-title')}</span> */}
                      <span className="uppercase"> Poll 01</span>{' '}
                      {item.isRunning ? (
                        // t('polls.poll-running')
                        <></>
                      ) : (
                        <div className="border border-Red-200 bg-Red-100 shadow-buttonShadow rounded-full h-[22px] px-1.5 text-xs text-Red-700 font-medium flex items-center">
                          {t('polls.poll-closed')}
                        </div>
                      )}
                    </DialogTitle>
                    <button
                      className="close-btn text-Gray-500 flex items-center justify-center"
                      type="button"
                      onClick={() => closeModal()}
                    >
                      <CloseIconSVG />
                    </button>
                  </div>
                  <div className="q-headline px-5 py-6 border border-Gray-100 bg-Gray-25 text-sm font-medium text-Gray-800">
                    <p className="">Q: {poll?.question}</p>
                  </div>
                  <div className="px-5 py-5">
                    <p className="text-sm font-medium text-Gray-800 mb-4">
                      {/* {t('polls.options')} */}
                      {t('polls.total-responses', {
                        count:
                          (pollResponses as any)?.responses['total_resp'] ?? 0,
                      })}
                    </p>
                    <div className="relative">
                      <div className="wrap grid gap-3">{renderOptions()}</div>
                      {isLoading ? (
                        <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
                          <div className="lds-ripple">
                            <div className="border-secondaryColor" />
                            <div className="border-secondaryColor" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="line h-1 w-full bg-Gray-50"></div>
                  <div className="px-5 py-5">
                    <p className="text-sm font-medium text-Gray-800 mb-3">
                      Didn’t Respond: 24
                    </p>
                    <div className="wrap grid grid-cols-4 gap-2 py-2 relative overflow-hidden rounded-xl bg-Gray-50 border border-gray-300">
                      <p className="px-[14px] text-xs font-medium text-Gray-800">
                        Kader2
                      </p>
                      <p className="px-[14px] text-xs font-medium text-Gray-800">
                        kader3
                      </p>
                      <p className="px-[14px] text-xs font-medium text-Gray-800">
                        kader3
                      </p>
                      <p className="px-[14px] text-xs font-medium text-Gray-800">
                        kader3
                      </p>
                      <p className="px-[14px] text-xs font-medium text-Gray-800">
                        kader3
                      </p>
                      <p className="px-[14px] text-xs font-medium text-Gray-800">
                        kader3
                      </p>
                      <p className="px-[14px] text-xs font-medium text-Gray-800">
                        kader3
                      </p>
                      <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-1/4"></div>
                      <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-1/2"></div>
                      <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-3/4"></div>
                    </div>
                  </div>
                  <div className="px-5 py-5 flex justify-end bg-Gray-25 border-t border-Gray-100">
                    {poll?.isRunning ? (
                      <button
                        className="h-10 3xl:h-11 px-5 flex items-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
                        onClick={endPoll}
                      >
                        {t('polls.end-poll')}
                      </button>
                    ) : (
                      <button
                        className="h-10 3xl:h-11 px-5 flex items-center justify-center w-full rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue border border-DarkBlue transition-all duration-300 hover:bg-DarkBlue shadow-buttonShadow"
                        onClick={() => publishPollResultByChat()}
                      >
                        {t('polls.publish-result')}
                      </button>
                    )}
                  </div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return <>{isOpen ? renderModal() : null}</>;
};

export default ViewDetails;
