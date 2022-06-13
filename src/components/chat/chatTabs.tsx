import React, { useEffect, useMemo, useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, Listbox, Transition } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { chatMessagesSelector } from '../../store/slices/chatMessagesSlice';
import Messages from './messages';
import {
  updateSelectedChatTab,
  updateUnreadPrivateMsgFrom,
} from '../../store/slices/roomSettingsSlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import useStorePreviousInt from '../../helpers/hooks/useStorePreviousInt';

const selectedChatTabSelector = createSelector(
  (state: RootState) => state.roomSettings.selectedChatTab,
  (selectedChatTab) => selectedChatTab,
);
const initiatePrivateChatSelector = createSelector(
  (state: RootState) => state.roomSettings.initiatePrivateChat,
  (initiatePrivateChat) => initiatePrivateChat,
);
const unreadPrivateMsgFromSelector = createSelector(
  (state: RootState) => state.roomSettings.unreadPrivateMsgFrom,
  (unreadPrivateMsgFrom) => unreadPrivateMsgFrom,
);

const people = [
  { id: 1, name: 'Durward Reynolds', unavailable: false },
  { id: 2, name: 'Kenton Towne', unavailable: false },
  { id: 3, name: 'Therese Wunsch', unavailable: false },
  { id: 4, name: 'Benedict Kessler', unavailable: true },
  { id: 5, name: 'Katelyn Rohan', unavailable: false },
];

const ChatTabs = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedChatTab = useAppSelector(selectedChatTabSelector);
  const lastSelectedTab = useStorePreviousInt(selectedChatTab.index);
  const initiatePrivateChat = useAppSelector(initiatePrivateChatSelector);
  const unreadPrivateMsgFrom = useAppSelector(unreadPrivateMsgFromSelector);
  const chatMessages = useAppSelector(chatMessagesSelector.selectAll);
  const [privateChatUsers, setPrivateChatUsers] = useState<Map<string, string>>(
    new Map(),
  );
  const currentUser = store.getState().session.currentUser;
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  const [selected, setSelected] = useState(people[0]);

  useEffect(() => {
    if (initiatePrivateChat.userId !== '') {
      privateChatUsers.set(
        initiatePrivateChat.userId,
        initiatePrivateChat.name,
      );
      setPrivateChatUsers(new Map(privateChatUsers));
    }
    chatMessages.forEach((m) => {
      if (m.isPrivate) {
        if (m.from.userId !== currentUser?.userId) {
          if (!privateChatUsers.has(m.from.userId)) {
            privateChatUsers.set(m.from.userId, m.from.name ?? '');
            setPrivateChatUsers(new Map(privateChatUsers));
          }
        } else if (m.from.userId === currentUser?.userId && m.to) {
          if (!privateChatUsers.has(m.to)) {
            const user = participantsSelector.selectById(
              store.getState(),
              m.to,
            );
            if (user) {
              privateChatUsers.set(user.userId, user.name);
              setPrivateChatUsers(new Map(privateChatUsers));
            }
          }
        }
      }
    });

    //eslint-disable-next-line
  }, [initiatePrivateChat, chatMessages]);

  const items = useMemo(() => {
    const items = [
      {
        id: 'public',
        title: t('left-panel.public-chat'),
        elm: <Messages userId="public" />,
      },
    ];

    privateChatUsers.forEach((u, id) => {
      items.push({
        id,
        title: u,
        elm: <Messages userId={id} />,
      });
    });

    return items;
  }, [privateChatUsers, t]);

  useEffect(() => {
    if (initiatePrivateChat.userId !== '') {
      let index = 0;
      items.forEach((item, i) => {
        if (item.id === initiatePrivateChat.userId) {
          index = i;
        }
      });
      if (index > 0) {
        dispatch(
          updateSelectedChatTab({
            index: index,
            userId: initiatePrivateChat.userId,
          }),
        );
      }
    }
    //eslint-disable-next-line
  }, [initiatePrivateChat, items]);

  useEffect(() => {
    if (selectedChatTab.index !== lastSelectedTab) {
      setSelectedTabIndex(selectedChatTab.index);
    }
  }, [selectedChatTab, lastSelectedTab, items]);

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };

  const changeTabIndex = (i) => {
    dispatch(
      updateSelectedChatTab({
        index: i,
        userId: items[i].id,
      }),
    );
    if (items[i].id === unreadPrivateMsgFrom) {
      dispatch(updateUnreadPrivateMsgFrom(''));
    }
  };

  return (
    <div className="h-full">
      <Tab.Group
        vertical
        selectedIndex={selectedTabIndex}
        onChange={changeTabIndex}
      >
        <Tab.List
          className={`private-m-tab relative z-10 item-${items.length}`}
        >
          <div className="inner">
            <div className="inner2">
              <div className="inner3 flex">
                {items.map((item) => (
                  <Tab
                    key={item.id}
                    className={({ selected }) =>
                      classNames(
                        'py-2 text-sm text-black font-bold leading-5 border-b-4 border-solid transition ease-in shrink-0 w-1/2',
                        selected ? 'border-primaryColor' : '',
                        unreadPrivateMsgFrom === item.id
                          ? 'border-secondaryColor'
                          : '',
                        // items.length === 1
                        //   ? 'w-full'
                        //   : 'w-[115px] xl:w-[150px]',
                      )
                    }
                  >
                    <div className="name relative inline-block">
                      {item.title}
                    </div>
                  </Tab>
                ))}
                <div className="w-1/2">
                  <Listbox value={selected} onChange={setSelected}>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                        <span className="block truncate">{selected.name}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100 z-90"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {people.map((person, personIdx) => (
                            <Listbox.Option
                              key={personIdx}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'text-gray-900'
                                }`
                              }
                              value={person}
                            >
                              {({ selected }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? 'font-medium' : 'font-normal'
                                    }`}
                                  >
                                    {person.name}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>
              </div>
            </div>
          </div>
        </Tab.List>
        <Tab.Panels className="relative h-full">
          {items.map((item) => (
            <Tab.Panel key={item.id} className="h-full">
              <>{item.elm}</>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default React.memo(ChatTabs);
