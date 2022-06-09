import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab } from '@headlessui/react';
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
        <Tab.List className={`private-m-tab relative item-${items.length}`}>
          <div className="inner">
            <div className="inner2">
              <div className="inner3 flex">
                {items.map((item) => (
                  <Tab
                    key={item.id}
                    className={({ selected }) =>
                      classNames(
                        'py-2 text-sm text-black font-bold leading-5 border-b-4 border-solid transition ease-in shrink-0',
                        selected ? 'border-primaryColor' : '',
                        unreadPrivateMsgFrom === item.id
                          ? 'border-secondaryColor'
                          : '',
                        items.length === 1
                          ? 'w-full'
                          : 'w-[115px] xl:w-[150px]',
                      )
                    }
                  >
                    <div className="name relative inline-block">
                      {item.title}
                    </div>
                  </Tab>
                ))}
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
