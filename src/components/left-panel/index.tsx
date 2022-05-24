import React, { useState, useEffect } from 'react';
import { Room } from 'livekit-client';
import { Tab } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import ParticipantsComponent from '../participants';
import PollsComponent from '../polls';
import { useGetPollsStatsQuery } from '../../store/services/pollsApi';

interface ILeftPanelProps {
  currentRoom: Room;
}

const LeftPanel = ({ currentRoom }: ILeftPanelProps) => {
  const { data } = useGetPollsStatsQuery();
  const { t } = useTranslation();

  const [items] = useState({
    'left-panel.participants-tab': {
      elm: <ParticipantsComponent currentRoom={currentRoom} />,
    },

    'left-panel.polls-tab': {
      elm: <PollsComponent />,
    },
  });

  useEffect(() => {
    if (data && data.status) {
      console.log(data);
    }
  }, [data]);

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <div
      id="main-left-panel"
      className="participants-wrapper relative z-10 left-0 top-0 h-full w-[200px] xl:w-[270px] multi-gradient"
    >
      <Tab.Group vertical>
        <Tab.List className="flex">
          {Object.keys(items).map((item) => (
            <Tab
              key={item}
              className={({ selected }) =>
                classNames(
                  'w-full py-2 text-sm text-black font-bold leading-5 border-b-4 border-solid transition ease-in',
                  selected ? 'border-[#004d90]' : 'border-[#004d90]/20',
                )
              }
            >
              <div className="name relative inline-block">
                {t(item)}
                <span className="absolute -right-[20px] -top-[7px] w-5 h-5 bg-primaryColor rounded-full text-white text-[10px]">
                  20
                </span>
              </div>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="relative h-[calc(100%-45px)]">
          {Object.values(items).map((item, idx) => (
            <Tab.Panel
              key={idx}
              className={`${
                idx === 1
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
