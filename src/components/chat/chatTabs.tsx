import React, { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { chatMessagesSelector } from '../../store/slices/chatMessagesSlice';
import Messages from './messages';
import { participantsSelector } from '../../store/slices/participantSlice';
import {
  updateSelectedChatOption,
  updateUnreadMsgFrom,
} from '../../store/slices/roomSettingsSlice';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';
import { updateIsActiveChatPanel } from '../../store/slices/bottomIconsActivitySlice';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';

interface IChatOptions {
  id: string;
  title: string;
}

const languages = [
  { id: 1, value: 'EN', name: 'English' },
  { id: 2, value: 'BN', name: 'Bangla' },
  { id: 3, value: 'CH', name: 'Chinese' },
  { id: 4, value: 'GR', name: 'Germany' },
];

const ChatTabs = () => {
  const [language, setLanguage] = useState(languages[1]);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const initiatePrivateChat = useAppSelector(
    (state) => state.roomSettings.initiatePrivateChat,
  );
  const unreadMsgFrom = useAppSelector(
    (state) => state.roomSettings.unreadMsgFrom,
  );
  const selectedChatOption = useAppSelector(
    (state) => state.roomSettings.selectedChatOption,
  );
  const chatMessages = useAppSelector(chatMessagesSelector.selectAll);
  const currentUser = store.getState().session.currentUser;

  const privateChatUsers = useMemo(() => {
    const users = new Map<string, string>();
    if (initiatePrivateChat.userId !== '') {
      users.set(initiatePrivateChat.userId, initiatePrivateChat.name);
    }
    chatMessages.forEach((m) => {
      if (m.isPrivate) {
        if (m.fromUserId !== currentUser?.userId) {
          users.set(m.fromUserId, m.fromName ?? '');
        } else if (
          m.fromUserId === currentUser?.userId &&
          m.toUserId &&
          m.toUserId !== currentUser?.userId
        ) {
          const user = participantsSelector.selectById(
            store.getState(),
            m.toUserId,
          );
          if (user) {
            users.set(user.userId, user.name);
          }
        }
      }
    });
    return users;
  }, [initiatePrivateChat, chatMessages, currentUser?.userId]);

  const chatOptions = useMemo(() => {
    const options: IChatOptions[] = [
      {
        id: 'public',
        title: t('left-panel.public-chat'),
      },
    ];
    privateChatUsers.forEach((name, id) => {
      options.push({
        id,
        title: name,
      });
    });
    return options;
  }, [privateChatUsers, t]);

  const selectedTitle = useMemo(() => {
    const selected = chatOptions.find((o) => o.id === selectedChatOption);
    return selected?.title ?? t('left-panel.public-chat');
  }, [selectedChatOption, chatOptions, t]);

  const onChange = (id: string) => {
    dispatch(updateSelectedChatOption(id));
    dispatch(
      updateUnreadMsgFrom({
        task: 'DEL',
        id: id,
      }),
    );
  };

  const closePanel = () => {
    dispatch(updateIsActiveChatPanel(false));
  };

  return (
    <div className="h-full">
      <div className="top-chat-header flex items-center gap-2 h-10 3xl:h-14 px-3 3xl:px-5 justify-between">
        <div className="left flex items-center gap-3">
          <p className="text-sm 3xl:text-base text-Gray-950 3xl:font-medium leading-tight">
            {selectedChatOption === 'public'
              ? t('left-panel.public-chat')
              : t('left-panel.private-chat')}
          </p>
          <Listbox value={language} onChange={setLanguage}>
            <ListboxButton className="lang h-6 3xl:h-8 w-9 3xl:w-[43px] flex items-center justify-center cursor-pointer border border-Gray-300 rounded-md 3xl:rounded-[11px] text-xs 3xl:text-sm font-medium 3xl:font-semibold text-Gray-950">
              {language.value}
            </ListboxButton>
            <ListboxOptions
              anchor="bottom"
              transition
              className="border border-gray-200 rounded-xl shadow-dropdown-menu bg-white overflow-hidden w-40 py-1.5"
            >
              {languages.map((lang) => (
                <ListboxOption key={lang.value} value={lang}>
                  {({ selected }) => (
                    <div className="text-sm cursor-pointer text-Gray-950 hover:bg-Gray-50 flex items-center justify-between px-3 3xl:px-4 py-2">
                      <span>{lang.name}</span>{' '}
                      {selected ? (
                        <span>
                          <CheckMarkIcon />
                        </span>
                      ) : null}
                    </div>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Listbox>
        </div>
        <div className="text-Gray-600 cursor-pointer" onClick={closePanel}>
          <CloseIconSVG />
        </div>
      </div>
      <Listbox value={selectedChatOption} onChange={onChange}>
        <div className="relative z-10 chat-tabs">
          <ListboxButton className="flex items-center justify-between border-y border-Gray-200 h-8 3xl:h-10 w-full outline-hidden px-3 3xl:px-5 text-xs 3xl:text-sm text-Gray-700">
            <p className="block truncate">
              To:{' '}
              <span className="font-medium text-Gray-950">{selectedTitle}</span>
            </p>
            <span className="pointer-events-none absolute inset-y-0 right-3 3xl:right-5 flex items-center">
              {unreadMsgFrom.length ? (
                <span className="shake pr-1 -mb-1">
                  <i className="pnm-chat shake" />
                </span>
              ) : null}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="none"
                className="h-auto w-3 3xl:w-4"
              >
                <path d="M12 6L8 10L4 6" fill="#4D6680" />
                <path
                  d="M12 6L8 10L4 6H12Z"
                  stroke="#4D6680"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </ListboxButton>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 z-90"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute max-h-60 w-[calc(100%-8px)] left-1 border border-Gray-100 bg-white shadow-lg rounded-2xl overflow-hidden p-2">
              <div className="title h-8 3xl:h-10 w-full flex items-center text-xs 3xl:text-sm leading-none text-Gray-700 px-3 uppercase">
                {t('left-panel.select-chat-conversation-title')}
              </div>
              {chatOptions.map((option) => (
                <ListboxOption
                  key={option.id}
                  className={({ focus, selected }) =>
                    `h-8 3xl:h-10 w-full cursor-pointer flex items-center text-sm 3xl:text-base gap-2 leading-none 3xl:font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50 relative ${
                      focus ? 'bg-Gray-50' : ''
                    } ${selected ? 'bg-Gray-50' : ''}`
                  }
                  value={option.id}
                >
                  {({ selected }) => (
                    <>
                      <span>
                        {option.title}
                        {unreadMsgFrom.filter((id) => id === option.id)
                          .length ? (
                          <span className="shake pl-2">
                            <i className="pnm-chat shake" />
                          </span>
                        ) : null}
                      </span>
                      {selected ? (
                        <span className="right absolute right-3">
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
      <div className="h-[calc(100%-135px)] 3xl:h-[calc(100%-176px)] chat-messages-container">
        <Messages userId={selectedChatOption} />
      </div>
    </div>
  );
};

export default React.memo(ChatTabs);
