import React, { ChangeEvent, Dispatch, SetStateAction } from 'react';
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

  const onChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const currenOptions = [...options];
    currenOptions[index].text = e.currentTarget.value;
    setOptions([...currenOptions]);
  };

  const removeOption = (index: number) => {
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

  return (
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
                  autoComplete="off"
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
  );
};

export default OptionsView;
