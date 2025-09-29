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
  label: string;
  id: string;
  value: string | number;
  onChange: (value: any) => void;
  options: ISelectOption[];
}

const Dropdown = ({ label, id, value, onChange, options }: ISelectProps) => {
  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  return (
    <Field as="div" className="flex items-center justify-between mb-2">
      <Label
        htmlFor={id}
        className="pr-4 flex-1 text-sm text-Gray-950 ltr:text-left rtl:text-right dark:text-dark-text"
      >
        {label}
      </Label>
      <Listbox value={value} onChange={onChange}>
        <div className="relative w-full max-w-[250px]">
          <ListboxButton
            id={id}
            className={`h-10 full cursor-pointer rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm dark:bg-dark-secondary dark:border-dark-text dark:text-dark-text`}
          >
            <span className="block truncate">{selectedOption?.text}</span>
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
            <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5 dark:bg-dark-secondary dark:border-dark-text">
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
                      {selected ? (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-Blue2-500">
                          <CheckMarkIcon />
                        </span>
                      ) : null}
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
