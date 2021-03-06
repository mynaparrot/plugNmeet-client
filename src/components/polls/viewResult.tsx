import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useGetPollResponsesResultQuery } from '../../store/services/pollsApi';

interface IViewResultProps {
  onCloseViewResult(): void;
  pollId: string;
}

const ViewResult = ({ pollId, onCloseViewResult }: IViewResultProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { t } = useTranslation();
  const { data, isLoading } = useGetPollResponsesResultQuery(pollId);

  const closeModal = () => {
    setIsOpen(false);
    onCloseViewResult();
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
                    {t('polls.view-result-title')}
                  </Dialog.Title>
                  <hr />
                  <div className="mt-2">
                    <p className="w-full text-lg font-bold text-black capitalize mb-2 pb-1 border-b border-solid border-primaryColor/20">
                      <span className="text-primaryColor">Q: </span>
                      {data?.result?.question}
                    </p>
                    <p className="w-full text-base">
                      {t('polls.total-responses', {
                        count: data?.result?.total_responses,
                      })}
                    </p>
                    <div className="pt-5">
                      <p className="text-base text-black block mb-2 pb-2 border-b border-solid border-primaryColor/20">
                        {t('polls.options')}
                      </p>
                      <div className="relative min-h-[75px]">
                        {data?.result?.options?.map((o) => {
                          return (
                            <p
                              className="relative w-full flex items-center justify-between"
                              key={o.id}
                            >
                              <span className="bg-white inline-block py-1 pr-2">
                                {o.text}
                              </span>
                              <span className="bg-white inline-block py-1 pl-2">
                                ({o.vote_count})
                              </span>
                            </p>
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

export default ViewResult;
