import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';

import { TrashIconSVG } from '../../../assets/Icons/TrashIconSVG';
import { PlusCircleIconSVG } from '../../../assets/Icons/PlusCircleIconSVG';
import { CreatePollOptions } from './index';

interface OptionsProps {
  options: CreatePollOptions[];
  setOptions: Dispatch<SetStateAction<CreatePollOptions[]>>;
}

const OptionsView = ({ options, setOptions }: OptionsProps) => {
  const { t } = useTranslation();

  // update option text
  const onChange = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      const newOptions = options.map((option, i) =>
        i === index ? { ...option, text: e.target.value } : option,
      );
      setOptions(newOptions);
    },
    [options, setOptions],
  );

  const removeOption = useCallback(
    (idToRemove: number) => {
      // Prevent removing below 2 options
      if (options.length <= 2) return;
      setOptions(options.filter((option) => option.id !== idToRemove));
    },
    [options, setOptions],
  );

  const addOption = useCallback(() => {
    setOptions((prev) => [
      ...prev,
      {
        id: (prev[prev.length - 1]?.id ?? 0) + 1,
        text: '',
      },
    ]);
  }, [setOptions]);

  const canRemove = useMemo(() => options.length > 2, [options.length]);

  return (
    <div className="option-field-wrapper pt-5 pb-6">
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
                  })}
                  className="default-input flex-1"
                  autoComplete="off"
                />
                {canRemove && (
                  <button
                    type="button"
                    className="h-11 w-11 border border-Red-200 bg-Red-50 text-Red-600 shadow-button-shadow rounded-[15px] flex items-center justify-center cursor-pointer"
                    onClick={() => removeOption(elm.id)}
                  >
                    <TrashIconSVG />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        className="w-full cursor-pointer h-10 3xl:h-11 text-sm 3xl:text-base font-semibold bg-Gray-50 hover:bg-Gray-100 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-button-shadow"
        type="button"
        onClick={addOption}
      >
        {t('polls.add-new-option')}
        <PlusCircleIconSVG />
      </button>
    </div>
  );
};

export default OptionsView;
