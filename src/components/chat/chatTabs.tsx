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
  updateUnreadMsgFrom,
} from '../../store/slices/roomSettingsSlice';

const selectedChatOptionSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.selectedChatOption,
);
const initiatePrivateChatSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.initiatePrivateChat,
);
const unreadMsgFromSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.unreadMsgFrom,
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
  const unreadMsgFrom = useAppSelector(unreadMsgFromSelector);
  const selectedChatOption = useAppSelector(selectedChatOptionSelector);

  const [chatOptions, setChatOptions] = useState<IChatOptions[]>([
    {
      id: 'public',
      title: t('left-panel.public-chat'),
    },
  ]);
  const [selectedTitle, setSelectedTitle] = useState<string>(
    t('left-panel.public-chat').toString(),
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
        } else if (
          m.from.userId === currentUser?.userId &&
          m.to &&
          m.to !== currentUser?.userId
        ) {
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
    dispatch(
      updateUnreadMsgFrom({
        task: 'DEL',
        id: id,
      }),
    );
  };

  return (
    <div className="h-full">
      <Listbox value={selectedChatOption} onChange={onChange}>
        <div className="relative h-10 z-10">
          <Listbox.Button className="flex items-center justify-between py-2 text-sm text-black dark:text-darkText font-bold leading-5 border-b-4 border-solid transition ease-in shrink-0 border-primaryColor w-full">
            <span className="block truncate pl-4 md:pl-6">{selectedTitle}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              {unreadMsgFrom.length ? (
                <span className="shake pr-1 -mb-1">
                  <i className="pnm-chat shake" />
                </span>
              ) : null}
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
            <Listbox.Options className="absolute max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-darkPrimary py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {chatOptions.map((option) => (
                <Listbox.Option
                  key={option.id}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active
                        ? 'bg-primaryColor text-white'
                        : 'text-gray-900 dark:text-darkText'
                    }`
                  }
                  value={option.id}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`flex truncate items-center justify-between ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {option.title}
                        {unreadMsgFrom.filter((id) => id === option.id)
                          .length ? (
                          <span className="shake pr-1">
                            <i className="pnm-chat shake" />
                          </span>
                        ) : null}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondaryColor">
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
      <div className="h-[calc(100%-40px)]">
        <Messages userId={selectedChatOption} />
      </div>
    </div>
  );
};

export default React.memo(ChatTabs);
