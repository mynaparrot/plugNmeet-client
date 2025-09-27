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

interface SpeechUsersSelectorProps {
  selectedSpeechUsers: Array<string>;
  setSelectedSpeechUsers: Dispatch<Array<string>>;
}

const SpeechUsersSelector = ({
  selectedSpeechUsers,
  setSelectedSpeechUsers,
}: SpeechUsersSelectorProps) => {
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

    // For performance, create a Map for instant user lookups (O(1))
    // This avoids searching the full user array for every selected user.
    const userMap = new Map(users.map((u) => [u.userId, u.name]));
    const selectedNames = selectedSpeechUsers
      .map((id) => userMap.get(id)) // O(1) lookup
      .filter(Boolean)
      .join(', ');

    return (
      <div className="">
        <label
          htmlFor="language"
          className="w-full text-sm font-medium text-Gray-800 ltr:text-left rtl:text-right block mb-2"
        >
          {t('speech-services.speech-users-label')}
        </label>
        <Listbox
          value={selectedSpeechUsers}
          onChange={setSelectedSpeechUsers}
          multiple={true}
        >
          <div className="relative w-full">
            <ListboxButton className="min-h-11 full rounded-2xl border border-Gray-300 bg-white shadow-input w-full px-3 pr-5 py-1 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-left text-sm text-Gray-950">
              <span className="block">{selectedNames}</span>
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

export default SpeechUsersSelector;
