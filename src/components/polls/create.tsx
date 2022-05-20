import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import sendAPIRequest from '../../helpers/api/plugNmeetAPI';

interface IOptions {
  id: number;
  text: string;
}
const Create = () => {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');

  const [options, setOptions] = useState<IOptions[]>([
    {
      id: 1,
      text: '',
    },
  ]);

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

  const onSubmit = async (e) => {
    e.preventDefault();
    const body = {
      question,
      options,
    };

    const res = await sendAPIRequest('/polls/create', body);
    if (res.status) {
      toast(t('polls.created-successfully'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }

    closeModal();
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
        <label>{t('polls.question')}</label>
        <input
          type="text"
          name="question"
          value={question}
          required={true}
          onChange={(e) => setQuestion(e.currentTarget.value)}
        />

        {options.map((elm, index) => (
          <div className="form-inline" key={elm.id}>
            <label>{t('polls.option', { count: index + 1 })}</label>
            <input
              type="text"
              required={true}
              name={`opt_${elm.id}`}
              value={elm.text}
              onChange={(e) => onChange(index, e)}
            />
            {index ? (
              <button
                type="button"
                className="button remove"
                onClick={() => removeOption(index)}
              >
                {t('polls.remove-option')}
              </button>
            ) : null}
          </div>
        ))}
        <div className="button-section">
          <button
            className="button add"
            type="button"
            onClick={() => addOption()}
          >
            {t('polls.add-new-option')}
          </button>
          <button className="button submit" type="submit">
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
      <button onClick={() => setIsOpen(true)}>{t('polls.create')}</button>
    </>
  );
};

export default Create;
