import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { selectChatKeys } from '../../store/slices/chatMessagesSlice';
import Messages from './messages';
import { participantsSelector } from '../../store/slices/participantSlice';
import {
  updateSelectedChatOption,
  updateUnreadMsgFrom,
} from '../../store/slices/roomSettingsSlice';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';
import { setActiveSidePanel } from '../../store/slices/bottomIconsActivitySlice';
import { CheckMarkIcon } from '../../assets/Icons/CheckMarkIcon';
import i18n from '../../helpers/i18n';
import ChatTranslation from './chatTranslation';
import { DropdownIconSVG } from '../../assets/Icons/DropdownIconSVG';

interface IChatOption {
  id: string;
  title: string;
  hasUnread: boolean;
}

const selectChatTabsData = createSelector(
  [
    selectChatKeys,
    participantsSelector.selectEntities,
    (state: RootState) => state.roomSettings.initiatePrivateChat,
    (state: RootState) => state.roomSettings.unreadMsgFrom,
    (state: RootState) => state.roomSettings.selectedChatOption,
  ],
  (
    chatKeys,
    participantEntities,
    initiatePrivateChat,
    unreadMsgFrom,
    selectedChatOption,
  ) => {
    const allKeys = [...chatKeys];
    // let's add user from initiatePrivateChat
    if (
      initiatePrivateChat.userId &&
      !allKeys.includes(initiatePrivateChat.userId)
    ) {
      allKeys.push(initiatePrivateChat.userId);
    }

    const options: IChatOption[] = [];
    allKeys.forEach((k) => {
      if (k === 'public') {
        options.push({
          id: 'public',
          title: i18n.t('left-panel.public-chat'),
          hasUnread: unreadMsgFrom.includes('public'),
        });
      } else {
        const participant = participantEntities[k];
        let title = k; // Use key as fallback
        if (participant) {
          title = participant.name;
        } else if (initiatePrivateChat.userId === k) {
          title = initiatePrivateChat.name;
        }

        options.push({
          id: k,
          title: title,
          hasUnread: unreadMsgFrom.includes(k),
        });
      }
    });

    const selected = options.find((o) => o.id === selectedChatOption);
    const selectedTitle = selected?.title ?? i18n.t('left-panel.public-chat');

    return {
      chatOptions: options,
      selectedChatOption,
      selectedTitle,
      hasUnreadMessages: unreadMsgFrom.length > 0,
    };
  },
);

interface ChatTabsProps {
  isRecorder: boolean;
}

const ChatTabs = ({ isRecorder }: ChatTabsProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const { chatOptions, selectedChatOption, selectedTitle, hasUnreadMessages } =
    useAppSelector(selectChatTabsData);

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
    dispatch(setActiveSidePanel(null));
  };

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  if (isRecorder) {
    return (
      <div className="h-full">
        <div className="h-full chat-messages-container">
          <Messages messageKey={selectedChatOption} isRecorder={isRecorder} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="top-chat-header flex items-center gap-2 h-10 px-3 3xl:px-5 justify-between">
        <div className="left flex items-center gap-3">
          <p className="text-sm text-Gray-950 dark:text-white 3xl:font-medium leading-tight">
            {selectedChatOption === 'public'
              ? t('left-panel.public-chat')
              : t('left-panel.private-chat')}
          </p>
          <ChatTranslation />
        </div>
        <button
          ref={closeBtnRef}
          type="button"
          aria-label={t('close').toString()}
          className="text-Gray-600 cursor-pointer focus-ring"
          onClick={closePanel}
        >
          <CloseIconSVG />
        </button>
      </div>
      <Listbox value={selectedChatOption} onChange={onChange}>
        <div className="relative z-10 chat-tabs">
          <ListboxButton className="flex items-center justify-between border-y border-Gray-200 dark:border-Gray-800 h-8 3xl:h-10 w-full outline-hidden focus-ring px-3 3xl:px-5 text-xs 3xl:text-sm text-Gray-700 dark:text-dark-text cursor-pointer">
            <p className="block truncate">
              To:{' '}
              <span className="font-medium text-Gray-950 dark:text-white">
                {selectedTitle}
              </span>
            </p>
            <span className="pointer-events-none absolute inset-y-0 end-3 3xl:end-5 flex items-center">
              {hasUnreadMessages && (
                <span className="shake pe-1 -mb-1">
                  <i className="pnm-chat shake" />
                </span>
              )}
              <DropdownIconSVG />
            </span>
          </ListboxButton>
          <ListboxOptions
            transition
            className="absolute max-h-60 w-[calc(100%-8px)] start-1 border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary shadow-lg rounded-2xl overflow-hidden p-2 transition ease-out data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75"
          >
            <div className="title h-8 w-full flex items-center text-xs leading-none text-Gray-700 dark:text-dark-text px-3 uppercase">
              {t('left-panel.select-chat-conversation-title')}
            </div>
            {chatOptions.map((option) => (
              <ListboxOption
                key={option.id}
                className={({ focus, selected }) =>
                  `h-8 w-full cursor-pointer flex items-center text-sm gap-2 leading-none 3xl:font-medium text-Gray-950 dark:text-dark-text px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50 dark:hover:bg-dark-secondary2 relative ${
                    focus ? 'bg-Gray-50 dark:bg-dark-secondary2' : ''
                  } ${selected ? 'bg-Gray-50 dark:bg-dark-secondary2' : ''}`
                }
                value={option.id}
              >
                {({ selected }) => (
                  <>
                    <span>
                      {option.title}
                      {option.hasUnread && (
                        <span className="shake ps-2">
                          <i className="pnm-chat shake" />
                        </span>
                      )}
                    </span>
                    {selected && (
                      <span className="end absolute end-3">
                        <CheckMarkIcon />
                      </span>
                    )}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
      <div className="flex-1 min-h-0 chat-messages-container">
        <Messages messageKey={selectedChatOption} isRecorder={isRecorder} />
      </div>
    </div>
  );
};

export default React.memo(ChatTabs);
