import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useCreatePollMutation } from '../../store/services/pollsApi';
import { CreatePollReq } from '../../helpers/proto/plugnmeet_polls_pb';

interface CreatePollOptions {
  id: number;
  text: string;
}

const Create = () => {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [createPoll, { isLoading, data }] = useCreatePollMutation();

  const [options, setOptions] = useState<CreatePollOptions[]>([
    {
      id: 1,
      text: '',
    },
    {
      id: 2,
      text: '',
    },
  ]);

  useEffect(() => {
    if (!isLoading && data) {
      if (data.status) {
        toast(t('polls.created-successfully'), {
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
    setQuestion('');
    setOptions([
      {
        id: 1,
        text: '',
      },
      {
        id: 2,
        text: '',
      },
    ]);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const body = new CreatePollReq({
      question,
      options,
    });
    createPoll(body);
  };

  const onChange = (index, e) => {
    const currenOptions = [...options];
    currenOptions[index].text = e.currentTarget.value;
    setOptions([...currenOptions]);
  };

  const removeOption = (index) => {
    const currenOptions = [...options];
    currenOptions.splice(index, 1);
    setOptions([...currenOptions]);
  };

  const addOption = () => {
    const currenOptions = [...options];
    const newOpt = {
      id: currenOptions[currenOptions.length - 1].id + 1,
      text: '',
    };
    currenOptions.push(newOpt);
    setOptions([...currenOptions]);
  };

  const renderForm = () => {
    return (
      <form onSubmit={onSubmit}>
        <label className="text-base text-black dark:text-darkText block mb-1">
          {t('polls.enter-question')}
        </label>
        <input
          type="text"
          name="question"
          value={question}
          required={true}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          placeholder="Ask a question"
          className="text-black placeholder:text-black/50 py-2 px-4 text-base w-full border border-solid border-primaryColor outline-none rounded-lg mb-4 bg-transparent dark:border-darkText dark:text-darkText placeholder:text-darkText"
        />
        <div className="flex items-start justify-between pb-2 pt-4 border-t border-solid border-primaryColor/20 dark:border-darkText/30">
          <p className="text-lg text-black dark:text-darkText block leading-4">
            {t('polls.options')}
          </p>
          <button
            className="h-7 px-3 leading-[28px] text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-sm font-semibold rounded-lg"
            type="button"
            onClick={() => addOption()}
          >
            {t('polls.add-new-option')}
          </button>
        </div>
        <div className="option-field-wrapper overflow-auto h-full max-h-[345px] scrollBar scrollBar2">
          <div className="option-field-inner">
            {options.map((elm, index) => (
              <div className="form-inline mb-4" key={elm.id}>
                <div className="input-wrapper w-full flex items-center">
                  <input
                    type="text"
                    required={true}
                    name={`opt_${elm.id}`}
                    value={elm.text}
                    onChange={(e) => onChange(index, e)}
                    placeholder={t('polls.option', {
                      count: index + 1,
                    }).toString()}
                    className="text-black placeholder:text-black/50 py-2 px-4 text-base w-[calc(100%-36px)] border border-solid border-primaryColor outline-none rounded-lg bg-transparent dark:text-darkText dark:border-darkText placeholder:text-darkText"
                  />
                  {index ? (
                    <button
                      type="button"
                      className="ml-2 p-1"
                      onClick={() => removeOption(index)}
                    >
                      <i className="pnm-delete w-5 h-5 dark:text-secondaryColor" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
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
            className="h-8 px-6 leading-[32px] text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg"
            type="submit"
          >
            {t('polls.create-poll')}
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
                    {t('polls.create')}
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

  return (
    <>
      {isOpen ? renderModal() : null}
      <button
        onClick={() => setIsOpen(true)}
        className="w-[calc(100%-20px)] ml-[10px] h-10 leading-[40px] text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg mb-2"
      >
        {t('polls.create')}
      </button>
    </>
  );
};

export default Create;
