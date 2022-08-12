import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  useAddResponseMutation,
  useGetPollListsQuery,
} from '../../store/services/pollsApi';
import { store } from '../../store';
import { toast } from 'react-toastify';
import { SubmitPollResponseReq } from '../../helpers/proto/plugnmeet_polls_pb';

interface IVoteFormProps {
  onCloseForm(): void;
  pollId: string;
}

const VoteForm = ({ onCloseForm, pollId }: IVoteFormProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedOption, setSelectedOption] = useState<number>(0);

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
      closeModal();
    }
    //eslint-disable-next-line
  }, [isLoading, data]);

  const closeModal = () => {
    setIsOpen(false);
    onCloseForm();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (selectedOption === 0) {
      return;
    }
    addResponse(
      new SubmitPollResponseReq({
        pollId: pollId,
        userId: store.getState().session.currentUser?.userId ?? '',
        name: store.getState().session.currentUser?.name ?? '',
        selectedOption: BigInt(selectedOption),
      }),
    );
  };

  const renderForm = () => {
    return (
      <form onSubmit={onSubmit}>
        <label className="text-base text-black dark:text-darkText block mb-2 pb-1 border-b border-solid border-primaryColor/20 dark:border-darkText/20">
          <span className="text-primaryColor dark:text-secondaryColor">Q:</span>
          {poll?.question}
        </label>
        <div className="">
          <p className="text-base text-black dark:text-white block mb-2 pb-1 border-b border-solid border-primaryColor/20 dark:border-darkText/20">
            {t('polls.select-option')}
          </p>
          <div className="mb-2 relative min-h-[75px]">
            {poll?.options.map((o) => {
              return (
                <div key={o.id} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${o.id}`}
                    value={o.id}
                    name={`option-${o.id}`}
                    checked={selectedOption === o.id}
                    onChange={(e) =>
                      setSelectedOption(Number(e.currentTarget.value))
                    }
                  />
                  <label
                    className="ml-2 dark:text-darkText"
                    htmlFor={`option-${o.id}`}
                  >
                    {o.text}
                  </label>
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
        </div>

        <div className="button-section flex items-center justify-end">
          <button
            className="h-7 px-6 leading-[28px] text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg"
            type="submit"
          >
            {t('polls.submit')}
          </button>
        </div>
      </form>
    );
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
                <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white text-left mb-2"
                  >
                    {t('polls.submit-vote-form-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-2">{renderForm()}</div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return renderModal();
};

export default VoteForm;
