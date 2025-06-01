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
          className="pr-4 w-auto dark:text-dark-text text-sm"
        >
          {t('speech-services.speech-users-label')}
        </label>
        <Listbox
          value={selectedSpeechUsers}
          onChange={setSelectedSpeechUsers}
          multiple={true}
        >
          <div className="relative mt-1 w-[150px] sm:w-[250px]">
            <ListboxButton className="relative min-h-[36px] w-full cursor-default py-1 pl-3 pr-7 text-left border border-gray-300 dark:border-dark-text dark:text-dark-text bg-transparent rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <span className="block">
                {selectedSpeechUsers
                  .map((l) => users.filter((u) => u.userId === l)[0]?.name)
                  .join(', ')}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ">
                <i className="pnm-updown text-xl primaryColor dark:text-dark-text" />
              </span>
            </ListboxButton>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto scrollBar scrollBar4 rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-hidden sm:text-sm">
                {users.map((u) => (
                  <ListboxOption
                    key={u.userId}
                    className={({ focus }) =>
                      `relative cursor-default select-none py-2 pr-4 pl-7 ${
                        focus ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                      }`
                    }
                    value={u.userId}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {u.name}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-amber-600">
                            <i className="pnm-check w-4 h-4" />
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
