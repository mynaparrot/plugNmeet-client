import React, { Dispatch, Fragment, useMemo } from 'react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { DropdownIconSVG } from '../../../assets/Icons/DropdownIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';

interface SpeechUsersElmsPros {
  selectedSpeechUsers: Array<string>;
  setSelectedSpeechUsers: Dispatch<Array<string>>;
}

const SpeechUsersElms = ({
  selectedSpeechUsers,
  setSelectedSpeechUsers,
}: SpeechUsersElmsPros) => {
  const { t } = useTranslation();
  const totalParticipants = useAppSelector(participantsSelector.selectTotal);

  return useMemo(() => {
    const users = participantsSelector
      .selectAll(store.getState())
      .filter(
        (p) =>
          p.name !== '' &&
          p.userId !== 'RECORDER_BOT' &&
          p.userId !== 'RTMP_BOT',
      );

    return (
      <div className="flex items-center justify-between mt-2">
        <label
          htmlFor="language"
          className="pr-4 w-full text-sm text-Gray-950 ltr:text-left rtl:text-right flex-1"
        >
          {t('speech-services.speech-users-label')}
        </label>
        <Listbox
          value={selectedSpeechUsers}
          onChange={setSelectedSpeechUsers}
          multiple={true}
        >
          <div className="relative w-[190px]">
            <ListboxButton className="min-h-10 full rounded-[8px] border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950">
              <span className="block">
                {selectedSpeechUsers
                  .map((l) => users.filter((u) => u.userId === l)[0]?.name)
                  .join(', ')}
              </span>
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
              <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] bg-white p-1 text-sm shadow-dropdown-menu border border-Gray-100 focus:outline-hidden scrollBar scrollBar2 grid gap-0.5">
                {users.map((u) => (
                  <ListboxOption
                    key={u.userId}
                    className={({ focus, selected }) =>
                      `relative cursor-default select-none py-2 px-3 rounded-[8px] truncate ${
                        focus ? 'bg-Blue2-50' : ''
                      } ${selected ? 'bg-Blue2-50' : ''}`
                    }
                    value={u.userId}
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block`}>{u.name}</span>
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
      </div>
    );
    //eslint-disable-next-line
  }, [totalParticipants, selectedSpeechUsers]);
};

export default SpeechUsersElms;
