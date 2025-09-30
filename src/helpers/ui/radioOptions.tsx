import React from 'react';

export interface IRadioOption {
  id: string;
  value: string | number;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface IRadioOptionsProps {
  options: IRadioOption[];
  name: string;
  checked: string | number | undefined;
  onChange: (value: any) => void;
}

const RadioOptions = ({
  options,
  name,
  checked,
  onChange,
}: IRadioOptionsProps) => {
  return (
    <div className="mt-4 pl-2 space-y-4">
      {options.map((option) => (
        <div
          key={option.id}
          className={`relative my-2 ${option.disabled ? 'opacity-50' : ''}`}
        >
          <div className="wrap flex items-center overflow-hidden">
            <input
              type="radio"
              value={option.value}
              name={name}
              id={option.id}
              disabled={option.disabled}
              checked={checked === option.value}
              onChange={() => onChange(option.value)}
              className="polls-checkbox relative appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-button-shadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600"
            />
            <label
              className="flex-1 text-sm text-Gray-900 w-full h-full z-10 pl-2 cursor-pointer"
              htmlFor={option.id}
            >
              {option.label}
            </label>
          </div>
          {option.description && (
            <p className="text-xs text-Red-400 pl-[26px]">
              {option.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default RadioOptions;
