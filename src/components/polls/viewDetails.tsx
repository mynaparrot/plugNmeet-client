import React, { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclosure } from '@headlessui/react';

import {
  useGetPollListsQuery,
  useGetPollResponsesQuery,
} from '../../store/services/pollsApi';
import { Dialog, Transition } from '@headlessui/react';

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
  const { data: pollResponses } = useGetPollResponsesQuery(pollId);

  const closeModal = () => {
    setIsOpen(false);
    onCloseViewDetails();
  };

  const endPoll = () => {
    // we'll end
  };

  const getOptSelectedCount = (id) => {
    if (typeof pollResponses?.responses[id + '_count'] !== 'undefined') {
      return pollResponses?.responses[id + '_count'];
    } else {
      return 0;
    }
  };

  const getRespondentsById = (id) => {
    if (
      pollResponses?.responses.all_respondents &&
      pollResponses?.responses.all_respondents !== ''
    ) {
      const respondents: Array<string> = JSON.parse(
        pollResponses?.responses.all_respondents,
      );

      return respondents.map((r, i) => {
        // format userId:selected_id
        const data = r.split(':');
        if (Number(data[1]) === id) {
          return <p key={i}>{data[0]}</p>;
        }
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
                      <button onClick={endPoll}>{t('polls.end-poll')}</button>
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
