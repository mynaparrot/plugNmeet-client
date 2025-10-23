import React, { Fragment, useMemo } from 'react';
import {
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';

import { DropdownIconSVG } from '../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';

export interface ISelectOption {
  value: string | number;
  text: string;
}

interface ISelectProps {
  label?: string;
  id: string;
  value: string | number | Array<string>;
  onChange: (value: any) => void;
  options: ISelectOption[];
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
  multiple?: boolean;
}

const Dropdown = ({
  label,
  id,
  value,
  onChange,
  options,
  direction = 'vertical',
  disabled = false,
  multiple = false,
}: ISelectProps) => {
  const displayValue = useMemo(() => {
    if (multiple) {
      if (Array.isArray(value) && value.length > 0) {
        return value
          .map((v) => options.find((o) => o.value === v)?.text)
          .filter(Boolean)
          .map((text) => (
            <span
              key={text}
              className="inline-block bg-Gray-100 text-Gray-800 text-xs font-medium mr-2 mb-1 px-2.5 py-1 rounded-full"
            >
              {text}
            </span>
          ));
      }
      return null; // Placeholder can be handled in JSX
    }
    return options.find((o) => o.value === value)?.text;
  }, [multiple, value, options]);

  if (direction === 'horizontal') {
    return (
      <Field as="div" className="mb-2">
        <div className="flex flex-wrap items-center justify-between">
          {label && label !== '' && (
            <Label
              htmlFor={id}
              className="pb-2 sm:pb-0 sm:pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right dark:text-dark-text"
            >
              {label}
            </Label>
          )}
          <Listbox
            value={value}
            onChange={onChange}
            disabled={disabled}
            multiple={multiple}
          >
            <div
              className={`relative w-full ${label ? 'max-w-full sm:max-w-[250px]' : ''}`}
            >
              <ListboxButton
                id={id}
                className={`min-h-10 full cursor-pointer rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm dark:bg-dark-secondary dark:border-dark-text dark:text-dark-text ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex flex-wrap">
                  {displayValue || (
                    <span className="text-Gray-500">{/* Placeholder */}</span>
                  )}
                </div>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <DropdownIconSVG />
                </span>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions
                  static
                  className="absolute z-20 mt-1 max-h-60 w-72 ltr:right-0 rtl:left-0 overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5 dark:bg-dark-secondary dark:border-dark-text"
                >
                  {options.map((option) => (
                    <ListboxOption
                      key={option.value.toString() + option.text}
                      value={option.value}
                      className={({ focus, selected }) =>
                        `relative select-none py-2 px-3 rounded-[8px] cursor-pointer ${
                          focus || selected
                            ? 'bg-Blue2-50 dark:bg-dark-primary'
                            : 'dark:text-dark-text'
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate`}>
                            {option.text}
                          </span>
                          {selected && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                              <CheckMarkIcon />
                            </span>
                          )}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>
      </Field>
    );
  }

  // default vertical
  return (
    <Field as="div" className="mb-2">
      {label && label !== '' && (
        <Label
          htmlFor={id}
          className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right mb-2 block dark:text-dark-text"
        >
          {label}
        </Label>
      )}
      <Listbox
        value={value}
        onChange={onChange}
        disabled={disabled}
        multiple={multiple}
      >
        <div className="relative w-full">
          <ListboxButton
            id={id}
            className={`min-h-11 full rounded-2xl border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950 dark:bg-dark-secondary dark:border-dark-text dark:text-dark-text ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex flex-wrap">
              {displayValue || (
                <span className="text-Gray-500">{/* Placeholder */}</span>
              )}
            </div>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <DropdownIconSVG />
            </span>
          </ListboxButton>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions
              static
              className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5 dark:bg-dark-secondary dark:border-dark-text"
            >
              {options.map((option) => (
                <ListboxOption
                  key={option.value.toString() + option.text}
                  value={option.value}
                  className={({ focus, selected }) =>
                    `relative select-none py-2 px-3 rounded-[8px] cursor-pointer ${
                      focus || selected
                        ? 'bg-Blue2-50 dark:bg-dark-primary'
                        : 'dark:text-dark-text'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate`}>{option.text}</span>
                      {selected && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                          <CheckMarkIcon />
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </Field>
  );
};

export default Dropdown;
