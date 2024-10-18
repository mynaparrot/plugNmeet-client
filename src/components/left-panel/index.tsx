import React, { useMemo } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import ParticipantsComponent from '../participants';
import PollsComponent from '../polls';
import { useGetPollsStatsQuery } from '../../store/services/pollsApi';
import { store, useAppDispatch, useAppSelector } from '../../store';
import { updateSelectedTabLeftPanel } from '../../store/slices/roomSettingsSlice';
import { useGetMyBreakoutRoomsQuery } from '../../store/services/breakoutRoomApi';
import MyBreakoutRooms from '../breakout-room/my/myBreakoutRooms';
import { updateIsActiveParticipantsPanel } from '../../store/slices/bottomIconsActivitySlice';

const LeftPanel = () => {
  const { data } = useGetPollsStatsQuery();
  const { data: myRooms } = useGetMyBreakoutRoomsQuery();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allow_polls =
    store.getState().session.currentRoom.metadata?.roomFeatures?.allowPolls;
  const selectedTabLeftPanel = useAppSelector(
    (state) => state.roomSettings.selectedTabLeftPanel,
  );

  const items = useMemo(() => {
    const total_running = data?.stats?.totalRunning
      ? Number(data?.stats?.totalRunning)
      : 0;
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
      <TabGroup
        vertical
        selectedIndex={selectedTabLeftPanel}
        onChange={changeTabIndex}
      >
        <TabList className="flex">
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
        </TabList>
        <TabPanels className="relative h-[calc(100%-45px)]">
          {items.map((item) => (
            <TabPanel
              key={item.id}
              className={`${
                item.id === 2 || item.id === 3
                  ? 'polls h-full'
                  : 'px-2 xl:px-4 pt-2 xl:pt-5 h-full'
              }`}
            >
              <>{item.elm}</>
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  );
};

export default LeftPanel;
