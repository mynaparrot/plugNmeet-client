import React, { Fragment, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { CreatePollReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useCreatePollMutation } from '../../store/services/pollsApi';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';
import { TrashIconSVG } from '../../assets/Icons/TrashIconSVG';
import { PlusCircleIconSVG } from '../../assets/Icons/PlusCircleIconSVG';

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
    if (isLoading) {
      return;
    }
    const body = create(CreatePollReqSchema, {
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
        <div className="question-area border-b border-Gray-100 px-6 pt-5 pb-6 bg-Gray-25">
          <label className="text-sm text-Gray-800 font-medium mb-2 inline-block">
            {t('polls.enter-question')}
          </label>
          <input
            type="text"
            name="question"
            value={question}
            required={true}
            onChange={(e) => setQuestion(e.currentTarget.value)}
            placeholder="Ask a question"
            className="default-input"
          />
        </div>

        <div className="option-field-wrapper px-6 pt-5 pb-6">
          <p className="text-sm text-Gray-800 font-medium mb-2 inline-block">
            {t('polls.options')}
          </p>
          <div className="overflow-auto h-full max-h-[345px] scrollBar scrollBar2 mb-5">
            <div className="option-field-inner grid gap-5">
              {options.map((elm, index) => (
                <div className="form-inline" key={elm.id}>
                  <div className="input-wrapper w-full flex items-center gap-2">
                    <input
                      type="text"
                      required={true}
                      name={`opt_${elm.id}`}
                      value={elm.text}
                      onChange={(e) => onChange(index, e)}
                      placeholder={t('polls.option', {
                        count: index + 1,
                      }).toString()}
                      className="default-input flex-1"
                    />
                    {index ? (
                      <button
                        type="button"
                        className="h-11 w-11 border border-Red-200 bg-Red-50 text-Red-600 shadow-buttonShadow rounded-[15px] flex items-center justify-center cursor-pointer"
                        onClick={() => removeOption(index)}
                      >
                        <TrashIconSVG />
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
          <button
            className="w-full h-10 3xl:h-11 text-sm 3xl:text-base font-semibold bg-Gray-50 hover:bg-Gray-100 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-buttonShadow"
            type="button"
            onClick={() => addOption()}
          >
            {t('polls.add-new-option')}
            <PlusCircleIconSVG />
          </button>
        </div>
        <div className="button-section flex items-center gap-5 py-6 px-6 border-t border-Gray-100">
          <button
            className="w-full h-10 3xl:h-11 text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-buttonShadow"
            type="button"
            onClick={() => closeModal()}
          >
            Cancel
          </button>
          <button
            className="w-full h-10 3xl:h-11 text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-buttonShadow"
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
                <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl">
                  <div className="top flex items-center justify-between py-4 px-6 border-b border-Gray-100">
                    <DialogTitle
                      as="h3"
                      className="text-sm 3xl:text-base font-semibold text-Gray-950"
                    >
                      {t('polls.create')}
                    </DialogTitle>
                    <button
                      className="close-btn text-Gray-500 flex items-center justify-center"
                      type="button"
                      onClick={() => closeModal()}
                    >
                      <CloseIconSVG />
                    </button>
                  </div>
                  <div className="">{renderForm()}</div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return (
    <>
      {isOpen ? renderModal() : null}
      <div className="button-wrap px-3 3xl:px-5 py-4 border-t border-Gray-200">
        <button
          onClick={() => setIsOpen(true)}
          className="h-10 3xl:h-11 px-5 flex items-center justify-center w-full rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue border border-DarkBlue transition-all duration-300 hover:bg-DarkBlue shadow-buttonShadow"
        >
          {t('polls.create')}
        </button>
      </div>
    </>
  );
};

export default Create;
