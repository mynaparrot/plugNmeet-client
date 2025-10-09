import React from 'react';
import clsx from 'clsx';
import { Field, Label } from '@headlessui/react';

interface IFormattedInputFieldProps {
  label?: string;
  id: string;
  value?: string | number;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}

const FormattedInputField = ({
  label,
  id,
  value,
  readOnly = false,
  placeholder,
  onChange,
  type = 'text',
}: IFormattedInputFieldProps) => {
  const inputClasses = clsx(
    'default-input rounded-[8px] h-10 w-full',
    {
      'dark:border-dark-text bg-transparent dark:text-dark-text cursor-default':
        readOnly,
    },
    label ? 'max-w-[250px]' : '',
  );

  return (
    <Field as="div" className="flex items-center justify-between mb-2">
      {label ? (
        <Label
          htmlFor={id}
          className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right dark:text-dark-text"
        >
          {label}
        </Label>
      ) : null}
      <input
        type={type}
        name={id}
        id={id}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={onChange}
        className={inputClasses}
        placeholder={placeholder}
      />
    </Field>
  );
};

export default FormattedInputField;
