import React from 'react';
import { Field, Label, Switch } from '@headlessui/react';
import clsx from 'clsx';

interface ISettingsSwitchProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  customCss?: string;
  helpText?: string;
}

const SettingsSwitch = ({
  label,
  enabled,
  onChange,
  disabled,
  customCss,
  helpText,
}: ISettingsSwitchProps) => {
  return (
    <Field as="div" className={clsx('block', customCss)}>
      <div className="flex items-center justify-between">
        <Label
          className={`pe-4 w-full text-sm text-Gray-950 text-start dark:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {label}
        </Label>
        <Switch
          disabled={disabled}
          checked={enabled}
          onChange={onChange}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-hidden focus-ring cursor-pointer ${
            enabled ? 'bg-Blue2-500' : 'bg-Gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`${
              enabled
                ? 'ltr:translate-x-4.5 rtl:-translate-x-4.5'
                : 'ltr:translate-x-1 rtl:-translate-x-1'
            } ${disabled ? 'cursor-not-allowed' : ''} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
          />
        </Switch>
      </div>
      {helpText && <p className="text-xs text-Gray-600 dark:text-Gray-300 mt-1">{helpText}</p>}
    </Field>
  );
};

export default SettingsSwitch;
