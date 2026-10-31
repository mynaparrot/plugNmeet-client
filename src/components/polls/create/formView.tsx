import React, { Dispatch, SetStateAction, SubmitEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import { CreatePollReqSchema } from 'plugnmeet-protocol-js';

import { useCreatePollMutation } from '../../../store/services/pollsApi';
import { CreatePollOptions } from './index';
import OptionsView from './optionsView';
import { POLL_QUICK_TYPES, PollQuickTypePreset, presetOptionTexts } from './presets';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../../store';
import { AIPollParseError, generatePollWithAI, parseAIPollDraft } from './pollAI';
import { LoadingIcon } from '../../../assets/Icons/Loading';
import SettingsSwitch from '../../../helpers/ui/settingsSwitch';
import Dropdown, { ISelectOption } from '../../../helpers/ui/dropdown';
import Tabs, { ITabItem } from '../../../helpers/ui/tabs';
import useIsPollAIEnabled from '../hooks/useIsPollAIEnabled';

interface FormViewProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const FormView = ({ setIsOpen }: FormViewProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [question, setQuestion] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [createPoll, { isLoading, data }] = useCreatePollMutation();

  const [options, setOptions] = useState<CreatePollOptions[]>([
    {
      id: 1,
      text: '',
      isCorrect: false,
    },
    {
      id: 2,
      text: '',
      isCorrect: false,
    },
  ]);

  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isMultiple, setIsMultiple] = useState<boolean>(false);
  const [isQuiz, setIsQuiz] = useState<boolean>(false);
  const [isTextAnswer, setIsTextAnswer] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const pollAIEnabled = useIsPollAIEnabled();

  const durationOptions: ISelectOption[] = [
    { value: 0, text: t('polls.duration-no-limit') },
    { value: 60, text: t('polls.duration-minutes', { count: 1 }) },
    { value: 300, text: t('polls.duration-minutes', { count: 5 }) },
    { value: 600, text: t('polls.duration-minutes', { count: 10 }) },
    { value: 1800, text: t('polls.duration-minutes', { count: 30 }) },
  ];

  // Quick type preset: replaces options only, question and toggles stay untouched
  const applyPreset = (preset: PollQuickTypePreset) => {
    // presets only make sense with options, so they are disabled in text-answer mode
    if (isTextAnswer) {
      return;
    }
    const texts = presetOptionTexts(preset, t);
    setOptions(
      texts.map((text, index) => ({
        id: index + 1,
        text,
        isCorrect: false,
      })),
    );
  };

  // Generate a draft with AI and prefill the form; nothing is created until
  // the user clicks Create.
  const onGenerateWithAI = async () => {
    if (aiLoading || aiPrompt.trim() === '') {
      return;
    }
    setAiLoading(true);
    try {
      const text = await generatePollWithAI(aiPrompt);
      const draft = parseAIPollDraft(text);
      setQuestion(draft.question);
      setIsTextAnswer(draft.isTextAnswer);
      setIsMultiple(draft.isMultiple);
      setIsQuiz(draft.isQuiz);
      // Text-answer drafts keep the existing option slots, so switching back to
      // a choice poll still has at least two valid options.
      if (!draft.isTextAnswer && draft.options.length > 0) {
        setOptions(
          draft.options.map((option, index) => ({
            id: index + 1,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        );
      }
      dispatch(
        addUserNotification({
          message: t('polls.notifications.ai-generated'),
          typeOption: 'info',
        }),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      dispatch(
        addUserNotification({
          message:
            e instanceof AIPollParseError
              ? t('polls.errors.ai-invalid-response')
              : t(message || 'polls.errors.generic'),
          typeOption: 'error',
        }),
      );
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      if (data.status) {
        // On success
        dispatch(
          addUserNotification({
            message: t('polls.notifications.created-successfully'),
            typeOption: 'info',
          }),
        );
        setIsOpen(false);
      } else {
        // On failure
        dispatch(
          addUserNotification({
            message: t(data.msg),
            typeOption: 'error',
          }),
        );
      }
    }
  }, [data, dispatch, setIsOpen, t]);

  // Clear stale inline validation errors as the form is edited
  useEffect(() => {
    setError('');
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [question, options, isQuiz, isTextAnswer]);

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }

    // Mirror of server rules: question must not be empty
    if (question.trim() === '') {
      setError(t('polls.errors.question-required'));
      return;
    }

    // Prevent submission if any option is empty
    if (!isTextAnswer && options.some((opt) => opt.text.trim() === '')) {
      dispatch(
        addUserNotification({
          message: t('polls.errors.option-required'),
          typeOption: 'error',
        }),
      );
      return;
    }

    // Mirror of server rules: quiz polls need at least one correct option
    if (!isTextAnswer && isQuiz && !options.some((opt) => opt.isCorrect)) {
      setError(t('polls.errors.select-correct-option'));
      return;
    }

    const body = create(CreatePollReqSchema, {
      question,
      // a text-answer poll has no options and is neither multiple nor a quiz
      options: isTextAnswer ? [] : options,
      isAnonymous,
      isMultiple: isTextAnswer ? false : isMultiple,
      isQuiz: isTextAnswer ? false : isQuiz,
      isTextAnswer,
      duration,
    });
    createPoll(body);
  };

  // Tabs: quick type chips and the AI prompt, both prefill the shared form below
  const tabItems: ITabItem[] = [
    {
      id: 'quick-types',
      title: t('polls.quick-types'),
      content: (
        <div className="flex flex-wrap gap-2">
          {POLL_QUICK_TYPES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="h-8 px-3 bg-Gray-50 dark:bg-Gray-800 rounded-[11px] text-xs md:text-sm text-Gray-800 dark:text-white font-semibold flex items-center hover:bg-Gray-100 dark:hover:bg-dark-secondary2 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-Gray-50 dark:disabled:hover:bg-Gray-800"
              disabled={isTextAnswer}
              onClick={() => applyPreset(preset)}
            >
              {presetOptionTexts(preset, t).join(' / ')}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'ai-generate',
      title: t('polls.ai-generate'),
      // Generation happens only via the Generate button below the textarea
      content: pollAIEnabled ? (
        <div className="grid gap-2">
          <textarea
            dir="auto"
            name="ai-prompt"
            rows={4}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.currentTarget.value)}
            placeholder={t('polls.ai-prompt-placeholder')}
            className="rounded-[15px] border border-Gray-300 dark:border-Gray-800 bg-white dark:bg-transparent shadow-input w-full px-3 py-2 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-sm 3xl:text-base text-Gray-950 dark:text-white"
            autoComplete="off"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={aiLoading || aiPrompt.trim() === ''}
              onClick={() => onGenerateWithAI()}
              className="h-10 px-4 cursor-pointer bg-Blue hover:bg-Dark-blue border border-Dark-blue rounded-[15px] text-sm text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading && (
                <LoadingIcon className="inline w-4 h-4 animate-spin" fillColor="#ffffff" />
              )}
              {t('polls.ai-generate')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-Gray-600 dark:text-Gray-300">{t('polls.ai-disabled-notice')}</p>
      ),
    },
  ];

  return (
    <form onSubmit={onSubmit}>
      {/* Quick types / AI generation tabs above the shared form */}
      <div className="poll-create-tabs-area border-b border-Gray-100 dark:border-Gray-800 pb-4 bg-Gray-25 dark:bg-dark-primary">
        <Tabs
          // No persistence key so Quick types is the active tab on every open
          uniqueKey=""
          items={tabItems}
        />
      </div>
      <div className="question-area border-b border-Gray-100 dark:border-Gray-800 pb-6 bg-Gray-25 dark:bg-dark-primary">
        <label className="text-sm text-Gray-800 dark:text-white font-medium mb-2 inline-block">
          {t('polls.enter-question')}
        </label>
        <input
          dir="auto"
          type="text"
          name="question"
          value={question}
          required={true}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          placeholder={t('polls.ask-question')}
          className="default-input"
          autoComplete="off"
        />
      </div>
      <div className="question-type-area border-b border-Gray-100 dark:border-Gray-800 pb-4 bg-Gray-25 dark:bg-dark-primary">
        <p className="text-sm text-Gray-800 dark:text-white font-medium mb-2 inline-block">
          {t('polls.question-type')}
        </p>
        <div
          role="radiogroup"
          aria-label={t('polls.question-type')}
          className="grid grid-cols-3 gap-2"
        >
          <label
            className={`flex items-center justify-center h-10 3xl:h-11 text-sm 3xl:text-base font-semibold border rounded-[12px] md:rounded-[15px] cursor-pointer transition-all duration-300 shadow-button-shadow ${
              !isMultiple && !isTextAnswer
                ? 'bg-Blue2-50 dark:bg-dark-secondary2 border-Blue2-500 text-Gray-950 dark:text-white'
                : 'bg-Gray-50 hover:bg-Gray-100 dark:bg-dark-secondary border-Gray-300 dark:border-Gray-800 text-Gray-800 dark:text-white'
            }`}
          >
            <input
              type="radio"
              name="poll-question-type"
              className="sr-only"
              checked={!isMultiple && !isTextAnswer}
              onChange={() => {
                setIsMultiple(false);
                setIsTextAnswer(false);
              }}
            />
            {t('polls.single-choice')}
          </label>
          <label
            className={`flex items-center justify-center h-10 3xl:h-11 text-sm 3xl:text-base font-semibold border rounded-[12px] md:rounded-[15px] cursor-pointer transition-all duration-300 shadow-button-shadow ${
              isMultiple && !isTextAnswer
                ? 'bg-Blue2-50 dark:bg-dark-secondary2 border-Blue2-500 text-Gray-950 dark:text-white'
                : 'bg-Gray-50 hover:bg-Gray-100 dark:bg-dark-secondary border-Gray-300 dark:border-Gray-800 text-Gray-800 dark:text-white'
            }`}
          >
            <input
              type="radio"
              name="poll-question-type"
              className="sr-only"
              checked={isMultiple && !isTextAnswer}
              onChange={() => {
                setIsMultiple(true);
                setIsTextAnswer(false);
              }}
            />
            {t('polls.multiple-choice')}
          </label>
          <label
            className={`flex items-center justify-center h-10 3xl:h-11 text-sm 3xl:text-base font-semibold border rounded-[12px] md:rounded-[15px] cursor-pointer transition-all duration-300 shadow-button-shadow ${
              isTextAnswer
                ? 'bg-Blue2-50 dark:bg-dark-secondary2 border-Blue2-500 text-Gray-950 dark:text-white'
                : 'bg-Gray-50 hover:bg-Gray-100 dark:bg-dark-secondary border-Gray-300 dark:border-Gray-800 text-Gray-800 dark:text-white'
            }`}
          >
            <input
              type="radio"
              name="poll-question-type"
              className="sr-only"
              checked={isTextAnswer}
              onChange={() => {
                setIsTextAnswer(true);
                setIsMultiple(false);
                setIsQuiz(false);
              }}
            />
            {t('polls.text-answer')}
          </label>
        </div>
      </div>
      {!isTextAnswer && <OptionsView options={options} setOptions={setOptions} isQuiz={isQuiz} />}
      {/* Advanced poll settings */}
      <div className="poll-settings-area pt-4 border-b border-Gray-100 dark:border-Gray-800 pb-4 grid gap-4">
        <div>
          <SettingsSwitch
            label={t('polls.anonymous-voting')}
            enabled={isAnonymous}
            onChange={setIsAnonymous}
          />
          <p className="text-xs md:text-sm opacity-70 dark:opacity-80 mt-1">
            {t('polls.anonymous-voting-desc')}
          </p>
        </div>
        {!isTextAnswer && (
          <div>
            <SettingsSwitch label={t('polls.quiz-mode')} enabled={isQuiz} onChange={setIsQuiz} />
            <p className="text-xs md:text-sm opacity-70 dark:opacity-80 mt-1">
              {t('polls.quiz-mode-desc')}
            </p>
          </div>
        )}
        <div>
          <Dropdown
            id="polls-duration"
            label={t('polls.duration')}
            value={duration}
            onChange={(v) => setDuration(Number(v))}
            options={durationOptions}
          />
          <p className="text-xs md:text-sm opacity-70 dark:opacity-80 mt-1">
            {t('polls.duration-desc')}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-Red-600 dark:text-Red-400 pt-3">
          {error}
        </p>
      )}
      {isLoading && (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 start-0 end-0 m-auto">
          <LoadingIcon
            className={'inline w-10 h-10 me-3 text-Gray-200 animate-spin'}
            fillColor={'#004D90'}
          />
        </div>
      )}
      <div className="button-section flex items-center gap-2 md:gap-5 pt-4 border-t border-Gray-100 dark:border-Gray-800">
        <button
          className="secondary-button w-full cursor-pointer h-10 3xl:h-11 text-sm 3xl:text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-button-shadow"
          type="button"
          onClick={() => setIsOpen(false)}
        >
          {t('close')}
        </button>
        <button
          className="primary-button w-full cursor-pointer h-10 3xl:h-11 text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isLoading}
        >
          {t('polls.create-poll')}
        </button>
      </div>
    </form>
  );
};

export default FormView;
