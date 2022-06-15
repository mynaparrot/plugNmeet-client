import React, { useEffect, useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Listbox, Transition } from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { chatMessagesSelector } from '../../store/slices/chatMessagesSlice';
import Messages from './messages';
import { participantsSelector } from '../../store/slices/participantSlice';
import {
  updateSelectedChatOption,
  updateUnreadPrivateMsgFrom,
} from '../../store/slices/roomSettingsSlice';

const selectedChatOptionSelector = createSelector(
  (state: RootState) => state.roomSettings.selectedChatOption,
  (selectedChatOption) => selectedChatOption,
);
const initiatePrivateChatSelector = createSelector(
  (state: RootState) => state.roomSettings.initiatePrivateChat,
  (initiatePrivateChat) => initiatePrivateChat,
);
const unreadPrivateMsgFromSelector = createSelector(
  (state: RootState) => state.roomSettings.unreadPrivateMsgFrom,
  (unreadPrivateMsgFrom) => unreadPrivateMsgFrom,
);

interface IChatOptions {
  id: string;
  title: string;
}

const ChatTabs = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const initiatePrivateChat = useAppSelector(initiatePrivateChatSelector);
  const chatMessages = useAppSelector(chatMessagesSelector.selectAll);
  const [privateChatUsers, setPrivateChatUsers] = useState<Map<string, string>>(
    new Map(),
  );
  const currentUser = store.getState().session.currentUser;
  const unreadPrivateMsgFrom = useAppSelector(unreadPrivateMsgFromSelector);
  const selectedChatOption = useAppSelector(selectedChatOptionSelector);

  const [chatOptions, setChatOptions] = useState<IChatOptions[]>([
    {
      id: 'public',
      title: t('left-panel.public-chat'),
    },
  ]);
  const [selectedTitle, setSelectedTitle] = useState<string>(
    t('left-panel.public-chat'),
  );

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

  useEffect(() => {
    const options = [
      {
        id: 'public',
        title: t('left-panel.public-chat'),
      },
    ];
    privateChatUsers.forEach((u, id) => {
      options.push({
        id,
        title: u,
      });
    });
    setChatOptions(options);
  }, [privateChatUsers, t]);

  useEffect(() => {
    const tmp = chatOptions.filter((o) => o.id === selectedChatOption);
    if (tmp.length) {
      setSelectedTitle(tmp[0].title);
    }
  }, [selectedChatOption, chatOptions]);

  const onChange = (id) => {
    dispatch(updateSelectedChatOption(id));
    if (id === unreadPrivateMsgFrom) {
      dispatch(updateUnreadPrivateMsgFrom(''));
    }
  };

  return (
    <div className="h-full">
      <Listbox value={selectedChatOption} onChange={onChange}>
        <div className="relative mt-1">
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
            <span className="block truncate">{selectedTitle}</span>
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
              {chatOptions.map((option) => (
                <Listbox.Option
                  key={option.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                    }`
                  }
                  value={option.id}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {option.title}
                        {unreadPrivateMsgFrom === option.id ? (
                          <i className="pnm-chat" />
                        ) : null}
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
      <div className="">
        <Messages userId={selectedChatOption} />
      </div>
    </div>
  );
};

export default React.memo(ChatTabs);
