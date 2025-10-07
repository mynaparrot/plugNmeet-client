import React from 'react';

interface ICheckboxProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const Checkbox = ({
  id,
  label,
  description,
  checked,
  onChange,
}: ICheckboxProps) => (
  <div className="item flex items-start">
    <div className="input">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="border cursor-pointer border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus mt-1 dark:bg-dark-secondary dark:border-dark-text"
      />
    </div>
    <div className="text-base w-full pl-4">
      <label
        htmlFor={id}
        className="font-medium text-Gray-950 dark:text-dark-text cursor-pointer"
      >
        {label}
        <p className="text-sm opacity-70 dark:opacity-80">{description}</p>
      </label>
    </div>
  </div>
);

export default Checkbox;
