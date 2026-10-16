import React from 'react';

export interface IRadioOption {
  id: string;
  value: string | number;
  label: React.ReactNode;
  description?: string;
  helpText?: string;
  disabled?: boolean;
  /**
   * Optional section/group heading. When set, options carrying the same label
   * are grouped under a muted heading, and a divider separates it from the
   * previous group. Callers that omit it keep the plain flat list.
   */
  sectionLabel?: string;
}

interface IRadioOptionsProps {
  options: IRadioOption[];
  name: string;
  checked: string | number | undefined;
  onChange: (value: any) => void;
}

const RadioOptions = ({ options, name, checked, onChange }: IRadioOptionsProps) => {
  const groups: { label?: string; options: IRadioOption[] }[] = [];
  options.forEach((option) => {
    const last = groups[groups.length - 1];
    if (!last || (option.sectionLabel && option.sectionLabel !== last.label)) {
      groups.push({ label: option.sectionLabel, options: [option] });
    } else {
      last.options.push(option);
    }
  });

  return (
    <div className="mt-4 ps-2">
      {groups.map((group, index) => (
        <div
          key={group.label ?? index}
          className={
            index > 0 && group.label
              ? 'mt-4 border-t border-Gray-100 dark:border-Gray-800 pt-4'
              : ''
          }
        >
          {group.label && (
            <span className="text-xs font-semibold uppercase tracking-wide text-Gray-500 dark:text-Gray-400">
              {group.label}
            </span>
          )}
          <div className="space-y-4">
            {group.options.map((option) => (
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
                    className="polls-checkbox relative appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-button-shadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600 focus-ring"
                  />
                  <label
                    className="flex-1 text-sm text-Gray-900 dark:text-white w-full h-full z-10 ps-2 cursor-pointer"
                    htmlFor={option.id}
                  >
                    {option.label}
                  </label>
                </div>
                {option.helpText && (
                  <p className="text-xs text-Gray-600 dark:text-Gray-300 ps-[26px] mt-1">
                    {option.helpText}
                  </p>
                )}
                {option.description && (
                  <p className="text-xs text-Red-400 ps-[26px]">{option.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RadioOptions;
