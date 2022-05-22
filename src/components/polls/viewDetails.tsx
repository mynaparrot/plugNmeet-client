import React, { Fragment, useEffect, useMemo, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import { Dialog, Disclosure, Transition } from '@headlessui/react';

import {
  useClosePollMutation,
  useGetPollListsQuery,
  useGetPollResponsesDetailsQuery,
} from '../../store/services/pollsApi';
import { toast } from 'react-toastify';
import {
  DataMessageType,
  IChatMsg,
  IDataMessage,
} from '../../store/slices/interfaces/dataMessages';
import {
  isSocketConnected,
  sendWebsocketMessage,
} from '../../helpers/websocket';
import { store } from '../../store';

interface IViewDetailsProps {
  onCloseViewDetails(): void;
  pollId: string;
}

const ViewDetails = ({ pollId, onCloseViewDetails }: IViewDetailsProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { t } = useTranslation();
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
        publishPollResultByChat();
      } else {
        toast(t(closePollRes.msg), {
          type: 'error',
        });
      }
      closeModal();
    }
    //eslint-disable-next-line
  }, [isLoading, closePollRes]);

  const closeModal = () => {
    setIsOpen(false);
    onCloseViewDetails();
  };

  const endPoll = () => {
    closePoll({
      poll_id: pollId,
    });
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
        return <p key={i}>{r}</p>;
      });
    }

    return null;
  };

  const renderOptions = () => {
    return poll?.options.map((o) => {
      return (
        <div className="" key={o.id}>
          <Disclosure>
            <Disclosure.Button className="py-2">
              {o.text} ({getOptSelectedCount(o.id)})
            </Disclosure.Button>
            <Disclosure.Panel className="text-gray-500">
              {getRespondentsById(o.id)}
            </Disclosure.Panel>
          </Disclosure>
        </div>
      );
    });
  };

  const publishPollResultByChat = () => {
    const session = store.getState().session;
    const elm = ReactDOMServer.renderToString(
      <>
        <p>{poll?.question}</p>
        <p>
          {t('polls.total-responses', {
            count: pollResponses?.responses.total_resp,
          })}
        </p>
        {poll?.options.map((o) => {
          return <p key={o.id}>{`${o.text} (${getOptSelectedCount(o.id)})`}</p>;
        })}
      </>,
    );
    const info: IChatMsg = {
      type: 'CHAT',
      isPrivate: false,
      time: '',
      message_id: '',
      from: {
        sid: session.currentUser?.sid ?? '',
        userId: session.currentUser?.userId ?? '',
        name: session.currentUser?.name,
      },
      msg: elm,
    };

    const data: IDataMessage = {
      type: DataMessageType.USER,
      room_sid: session.currentRoom.sid,
      message_id: '',
      body: info,
    };

    if (isSocketConnected()) {
      sendWebsocketMessage(JSON.stringify(data));
    }
  };

  const renderModal = () => {
    return (
      <>
        <Transition appear show={isOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-[9999] overflow-y-auto"
            onClose={closeModal}
          >
            <div className="min-h-screen px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor absolute top-0 left-0 -rotate-45" />
                  </button>

                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 text-left mb-2"
                  >
                    {t('polls.view-details-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-6">
                    <div className="mb-10">
                      {poll?.is_running ? (
                        <button onClick={endPoll}>{t('polls.end-poll')}</button>
                      ) : null}
                    </div>

                    <label className="text-sm text-black block mb-1">
                      {t('polls.question')}
                    </label>
                    <p>{poll?.question}</p>
                    <p>
                      {t('polls.total-responses', {
                        count: pollResponses?.responses.total_resp,
                      })}
                    </p>
                    <div className="">
                      <p>{t('polls.options')}</p>
                      <div className="">{renderOptions()}</div>
                    </div>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return <>{isOpen ? renderModal() : null}</>;
};

export default ViewDetails;
