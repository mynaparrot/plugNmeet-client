import React from 'react';
import { Field, Label, Switch } from '@headlessui/react';
import clsx from 'clsx';

interface ISettingsSwitchProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  customCss?: string;
}

const SettingsSwitch = ({
  label,
  enabled,
  onChange,
  disabled,
  customCss,
}: ISettingsSwitchProps) => {
  return (
    <Field
      as="div"
      className={clsx('flex items-center justify-between', customCss)}
    >
      <Label
        className={`pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right dark:text-dark-text ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {label}
      </Label>
      <Switch
        disabled={disabled}
        checked={enabled}
        onChange={onChange}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 cursor-pointer ${
          enabled ? 'bg-Blue2-500' : 'bg-Gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`${
            enabled
              ? 'ltr:translate-x-4.5 rtl:-translate-x-4.5'
              : 'ltr:translate-x-1 rtl:-translate-x-0.5'
          } ${disabled ? 'cursor-not-allowed' : ''} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
        />
      </Switch>
    </Field>
  );
};

export default SettingsSwitch;
