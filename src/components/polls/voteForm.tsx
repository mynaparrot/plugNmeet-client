import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  useAddResponseMutation,
  useGetPollListsQuery,
} from '../../store/services/pollsApi';
import { store } from '../../store';
import { toast } from 'react-toastify';

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
    addResponse({
      poll_id: pollId,
      user_id: store.getState().session.currentUser?.userId ?? '',
      name: store.getState().session.currentUser?.name ?? '',
      selected_option: selectedOption,
    });
  };

  const renderForm = () => {
    return (
      <form onSubmit={onSubmit}>
        <label className="text-sm text-black block mb-1">
          {poll?.question}
        </label>
        <div className="">
          <p>{t('polls.select-option')}</p>
          <div className="">
            {poll?.options.map((o) => {
              return (
                <div key={o.id} className="">
                  <input
                    type="radio"
                    value={o.id}
                    name="option"
                    checked={selectedOption === o.id}
                    onChange={(e) =>
                      setSelectedOption(Number(e.currentTarget.value))
                    }
                  />
                  {o.text}
                </div>
              );
            })}
          </div>
        </div>

        <div className="button-section flex items-center justify-between">
          <button
            className="h-8 px-6 leading-[32px] ml-2 text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg"
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
                    {t('polls.submit-vote-form-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-6">{renderForm()}</div>
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
