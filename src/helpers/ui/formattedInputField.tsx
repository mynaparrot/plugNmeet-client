import React from 'react';
import clsx from 'clsx';
import { Field, Label } from '@headlessui/react';

interface IFormattedInputFieldProps {
  label: string;
  id: string;
  value?: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FormattedInputField = ({
  label,
  id,
  value,
  readOnly = false,
  placeholder,
  onChange,
}: IFormattedInputFieldProps) => {
  const inputClasses = clsx(
    'default-input rounded-[8px] w-full max-w-[250px] h-10',
    {
      'dark:border-dark-text bg-transparent dark:text-dark-text cursor-default':
        readOnly,
    },
  );

  return (
    <Field as="div" className="flex items-center justify-between mb-2">
      <Label
        htmlFor={id}
        className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right dark:text-dark-text"
      >
        {label}
      </Label>
      <input
        type="text"
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
