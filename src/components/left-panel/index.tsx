import React, { useState } from 'react';
import { Room } from 'livekit-client';
import { Tab } from '@headlessui/react';

import ParticipantsComponent from '../participants';
import PollsComponent from '../polls';

interface ILeftPanelProps {
  currentRoom: Room;
}

const LeftPanel = ({ currentRoom }: ILeftPanelProps) => {
  const [items] = useState({
    Participants: {
      elm: <ParticipantsComponent currentRoom={currentRoom} />,
    },

    Polls: {
      elm: <PollsComponent />,
    },
  });

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <div
      id="main-left-panel"
      className="participants-wrapper scrollBar relative z-10 left-0 top-0 h-full w-[200px] xl:w-[270px] px-2 xl:px-4 pt-2 xl:pt-5 overflow-auto multi-gradient"
    >
      <Tab.Group vertical>
        <Tab.List className="flex p-1 space-x-1 bg-primaryColor rounded-xl">
          {Object.keys(items).map((item) => (
            <Tab
              key={item}
              className={({ selected }) =>
                classNames(
                  'w-full py-1 text-xs sm:text-sm leading-5 font-medium text-secondaryColor rounded-lg outline-none',
                  'ring-white ring-opacity-60',
                  selected
                    ? 'bg-white shadow text-primaryColor'
                    : 'hover:bg-white/[0.12] hover:text-white',
                )
              }
            >
              {item}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          {Object.values(items).map((item, idx) => (
            <Tab.Panel key={idx} className="bg-white rounded-xl p-3">
              <>{item.elm}</>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default React.memo(LeftPanel);
