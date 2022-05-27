import React, { useMemo } from 'react';
import { Room } from 'livekit-client';
import { Tab } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import ParticipantsComponent from '../participants';
import PollsComponent from '../polls';
import { useGetPollsStatsQuery } from '../../store/services/pollsApi';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { updateSelectedTabLeftPanel } from '../../store/slices/roomSettingsSlice';

interface ILeftPanelProps {
  currentRoom: Room;
}

const selectedTabLeftPanelSelector = createSelector(
  (state: RootState) => state.roomSettings.selectedTabLeftPanel,
  (isActiveChatPanel) => isActiveChatPanel,
);

const LeftPanel = ({ currentRoom }: ILeftPanelProps) => {
  const { data } = useGetPollsStatsQuery();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allow_polls =
    store.getState().session.currentRoom.metadata?.room_features.allow_polls;
  const selectedTabLeftPanel = useAppSelector(selectedTabLeftPanelSelector);

  const items = useMemo(() => {
    const total_running = data?.stats?.total_running ?? 0;
    const items = [
      {
        id: 1,
        title: <>{t('left-panel.participants-tab')}</>,
        elm: <ParticipantsComponent currentRoom={currentRoom} />,
      },
    ];
    if (allow_polls) {
      items.push({
        id: 2,
        title: (
          <>
            {t('left-panel.polls-tab')}
            {total_running > 0 ? (
              <span className="absolute -right-[20px] -top-[7px] w-5 h-5 bg-primaryColor rounded-full text-white text-[10px]">
                {total_running ?? 0}
              </span>
            ) : null}
          </>
        ),
        elm: <PollsComponent />,
      });
    }

    return items;
    //eslint-disable-next-line
  }, [data]);

  const changeTabIndex = (i) => {
    dispatch(updateSelectedTabLeftPanel(i));
  };

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };

  return (
    <div
      id="main-left-panel"
      className="participants-wrapper relative z-10 left-0 top-0 h-full w-[200px] xl:w-[270px] multi-gradient"
    >
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
                  'w-full py-2 text-sm text-black font-bold leading-5 border-b-4 border-solid transition ease-in',
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
                item.id === 2
                  ? 'polls h-full'
                  : 'px-2 xl:px-4 pt-2 xl:pt-5 h-full overflow-auto scrollBar'
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
