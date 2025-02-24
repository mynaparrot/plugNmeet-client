import React, { useEffect, useState, Fragment } from 'react';
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

interface IChatOptions {
  id: string;
  title: string;
}

const ChatTabs = () => {
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
  const [privateChatUsers, setPrivateChatUsers] = useState<Map<string, string>>(
    new Map(),
  );
  const currentUser = store.getState().session.currentUser;

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
        if (m.fromUserId !== currentUser?.userId) {
          if (!privateChatUsers.has(m.fromUserId)) {
            privateChatUsers.set(m.fromUserId, m.fromName ?? '');
            setPrivateChatUsers(new Map(privateChatUsers));
          }
        } else if (
          m.fromUserId === currentUser?.userId &&
          m.toUserId &&
          m.toUserId !== currentUser?.userId
        ) {
          if (!privateChatUsers.has(m.toUserId)) {
            const user = participantsSelector.selectById(
              store.getState(),
              m.toUserId,
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
            {selectedChatOption === 'public' ? 'Public Chat' : 'Private Chat'}
          </p>
          <div className="lang h-6 3xl:h-8 w-9 3xl:w-[43px] flex items-center justify-center cursor-pointer border border-Gray-300 rounded-md 3xl:rounded-[11px] text-xs 3xl:text-sm font-medium 3xl:font-semibold text-Gray-950">
            EN
          </div>
        </div>
        <div className="text-Gray-600 cursor-pointer" onClick={closePanel}>
          <CloseIconSVG />
        </div>
      </div>
      <Listbox value={selectedChatOption} onChange={onChange}>
        <div className="relative z-10 chat-tabs">
          <ListboxButton className="flex items-center justify-between border-y border-Gray-200 h-8 3xl:h-10 w-full outline-none px-3 3xl:px-5 text-xs 3xl:text-sm text-Gray-700">
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
            <ListboxOptions className="absolute max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-xs 3xl:text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {chatOptions.map((option) => (
                <ListboxOption
                  key={option.id}
                  className={({ focus }) =>
                    `relative cursor-pointer select-none py-1 3xl:py-2 pl-8 3xl:pl-10 pr-4 text-gray-900 ${
                      focus ? 'bg-Gray-200' : ''
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
                        <span className="absolute inset-y-0 left-3 flex items-center text-secondaryColor">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-auto w-4 3xl:w-5"
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
