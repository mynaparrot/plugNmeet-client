import React, { useMemo } from 'react';
import { Tab } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import ParticipantsComponent from '../participants';
import PollsComponent from '../polls';
import { useGetPollsStatsQuery } from '../../store/services/pollsApi';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { updateSelectedTabLeftPanel } from '../../store/slices/roomSettingsSlice';
import { useGetMyBreakoutRoomsQuery } from '../../store/services/breakoutRoomApi';
import MyBreakoutRooms from '../breakout-room/my/myBreakoutRooms';
import { updateIsActiveParticipantsPanel } from '../../store/slices/bottomIconsActivitySlice';

const selectedTabLeftPanelSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.selectedTabLeftPanel,
);

const LeftPanel = () => {
  const { data } = useGetPollsStatsQuery();
  const { data: myRooms } = useGetMyBreakoutRoomsQuery();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allow_polls =
    store.getState().session.currentRoom.metadata?.room_features.allow_polls;
  const selectedTabLeftPanel = useAppSelector(selectedTabLeftPanelSelector);

  const items = useMemo(() => {
    const total_running = Number(data?.stats?.totalRunning) ?? 0;
    const items = [
      {
        id: 1,
        title: <>{t('left-panel.participants-tab')}</>,
        elm: <ParticipantsComponent />,
      },
    ];
    if (allow_polls) {
      items.push({
        id: 2,
        title: (
          <>
            {t('left-panel.polls-tab')}
            {total_running > 0 ? (
              <span className="absolute ltr:-right-5 rtl:-left-5 -top-[7px] w-5 h-5 bg-primaryColor rounded-full text-white text-[10px]">
                {total_running ?? 0}
              </span>
            ) : null}
          </>
        ),
        elm: <PollsComponent />,
      });
    }

    if (myRooms?.status) {
      items.push({
        id: 3,
        title: <>{t('left-panel.breakout-room-tab')}</>,
        elm: <MyBreakoutRooms />,
      });
    }

    return items;
    //eslint-disable-next-line
  }, [data, myRooms]);

  const changeTabIndex = (i) => {
    dispatch(updateSelectedTabLeftPanel(i));
  };

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };

  const closePanel = () => {
    dispatch(updateIsActiveParticipantsPanel(false));
  };

  return (
    <div
      id="main-left-panel"
      className="participants-wrapper relative z-10 left-0 top-0 h-full w-[330px] multi-gradient"
    >
      <div
        className="hidden md:inline-block close absolute z-10 -right-[14px] top-1 w-6 h-6 rounded-full border border-solid border-primaryColor dark:border-darkText bg-white dark:bg-darkPrimary cursor-pointer"
        onClick={closePanel}
      >
        <span className="inline-block w-[18px] h-[1px] bg-primaryColor dark:bg-darkText absolute rotate-45 top-[11px] left-[2px]"></span>
        <span className="inline-block w-[18px] h-[1px] bg-primaryColor dark:bg-darkText absolute -rotate-45 top-[11px] right-[2px]"></span>
      </div>
      <Tab.Group
        vertical
        selectedIndex={selectedTabLeftPanel}
        onChange={changeTabIndex}
      >
        <Tab.List className="flex">
          {items.map((item) => (
            <Tab
              key={item.id}
              className={({ selected }) =>
                classNames(
                  'w-full py-2 text-xs text-black dark:text-white font-bold leading-5 border-b-4 border-solid transition ease-in',
                  selected ? 'border-[#004d90]' : 'border-[#004d90]/20',
                )
              }
            >
              <div className="name relative inline-block">{item.title}</div>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="relative h-[calc(100%-45px)]">
          {items.map((item) => (
            <Tab.Panel
              key={item.id}
              className={`${
                item.id === 2 || item.id === 3
                  ? 'polls h-full'
                  : 'px-2 xl:px-4 pt-2 xl:pt-5 h-full'
              }`}
            >
              <>{item.elm}</>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default React.memo(LeftPanel);
