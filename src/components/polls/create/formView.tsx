import React, {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { CreatePollReqSchema } from 'plugnmeet-protocol-js';

import { useCreatePollMutation } from '../../../store/services/pollsApi';
import { CreatePollOptions } from './index';
import OptionsView from './optionsView';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../../store';
import { LoadingIcon } from '../../../assets/Icons/Loading';

interface FormViewProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const FormView = ({ setIsOpen }: FormViewProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [question, setQuestion] = useState<string>('');
  const [locked, setLocked] = useState<boolean>(false);
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
        dispatch(
          addUserNotification({
            message: t('polls.created-successfully'),
            typeOption: 'info',
          }),
        );
        setIsOpen(false);
      } else {
        dispatch(
          addUserNotification({
            message: t(data.msg),
            typeOption: 'error',
          }),
        );
      }
      setLocked(false);
    }
    //eslint-disable-next-line
  }, [isLoading, data, dispatch]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || locked) {
      return;
    }
    setLocked(true);
    const body = create(CreatePollReqSchema, {
      question,
      options,
    });
    createPoll(body);
  };

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
          autoComplete="off"
        />
      </div>
      <OptionsView options={options} setOptions={setOptions} />
      {isLoading ? (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
          <LoadingIcon
            className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
        </div>
      ) : null}
      <div className="button-section flex items-center gap-5 py-6 px-6 border-t border-Gray-100">
        <button
          className="w-full h-10 3xl:h-11 text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-buttonShadow"
          type="button"
          onClick={() => setIsOpen(false)}
        >
          {t('close')}
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

export default FormView;
