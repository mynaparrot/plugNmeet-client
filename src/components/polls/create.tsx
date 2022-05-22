import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useCreatePollMutation } from '../../store/services/pollsApi';
import { CreatePollOptions } from '../../store/services/pollsApiTypes';

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
    ]);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const body = {
      question,
      options,
    };
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
        <label className="text-sm text-black block mb-1">
          {t('polls.enter-question')}
        </label>
        <input
          type="text"
          name="question"
          value={question}
          required={true}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          placeholder="Ask a question"
          className="text-black placeholder:text-black/50 py-2 px-4 text-sm w-full border border-solid border-primaryColor outline-none rounded-lg mb-4"
        />
        <p>{t('polls.options')}</p>
        {options.map((elm, index) => (
          <div className="form-inline mb-4" key={elm.id}>
            <label className="text-sm text-black block mb-1">
              {t('polls.option', { count: index + 1 })}
            </label>
            <div className="input-wrapper w-full flex items-center">
              <input
                type="text"
                required={true}
                name={`opt_${elm.id}`}
                value={elm.text}
                onChange={(e) => onChange(index, e)}
                placeholder={`Option ${index + 1}`}
                className="text-black placeholder:text-black/50 py-2 px-4 text-sm w-full border border-solid border-primaryColor outline-none rounded-lg"
              />
              {index ? (
                <button
                  type="button"
                  className="ml-2 p-1"
                  onClick={() => removeOption(index)}
                >
                  {/* {t('polls.remove-option')} */}
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    x="0px"
                    y="0px"
                    viewBox="0 0 284.011 284.011"
                    className="w-5 h-5"
                  >
                    <path
                      d="M235.732,66.214l-28.006-13.301l1.452-3.057c6.354-13.379,0.639-29.434-12.74-35.789L172.316,2.611
                      c-6.48-3.079-13.771-3.447-20.532-1.042c-6.76,2.406-12.178,7.301-15.256,13.782l-1.452,3.057L107.07,5.106
                      c-14.653-6.958-32.239-0.698-39.2,13.955L60.7,34.155c-1.138,2.396-1.277,5.146-0.388,7.644c0.89,2.499,2.735,4.542,5.131,5.68
                      l74.218,35.25h-98.18c-2.797,0-5.465,1.171-7.358,3.229c-1.894,2.059-2.839,4.815-2.607,7.602l13.143,157.706
                      c1.53,18.362,17.162,32.745,35.588,32.745h73.54c18.425,0,34.057-14.383,35.587-32.745l11.618-139.408l28.205,13.396
                      c1.385,0.658,2.845,0.969,4.283,0.969c3.74,0,7.328-2.108,9.04-5.712l7.169-15.093C256.646,90.761,250.386,73.175,235.732,66.214z
                      M154.594,23.931c0.786-1.655,2.17-2.905,3.896-3.521c1.729-0.614,3.59-0.521,5.245,0.267l24.121,11.455
                      c3.418,1.624,4.878,5.726,3.255,9.144l-1.452,3.057l-36.518-17.344L154.594,23.931z M169.441,249.604
                      c-0.673,8.077-7.55,14.405-15.655,14.405h-73.54c-8.106,0-14.983-6.328-15.656-14.405L52.35,102.728h129.332L169.441,249.604z
                      M231.62,96.835l-2.878,6.06L83.057,33.701l2.879-6.061c2.229-4.695,7.863-6.698,12.554-4.469l128.661,61.108
                      C231.845,86.509,233.85,92.142,231.62,96.835z"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <div className="button-section flex items-center justify-between">
          <button
            className="h-8 px-6 leading-[32px] mr-2 text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg"
            type="button"
            onClick={() => addOption()}
          >
            {t('polls.add-new-option')}
          </button>
          <button
            className="h-8 px-6 leading-[32px] ml-2 text-center transition ease-in bg-primaryColor hover:bg-secondaryColor text-white text-base font-semibold rounded-lg"
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
