import React, { Dispatch, SetStateAction, useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { FooterMenuIconSVG } from '../../../assets/Icons/FooterMenuIconSVG';
import { PollDataWithOption, publishPollResultByChat } from '../utils';
import { useEndPoll } from '../hooks/useEndPoll';

interface PollActionsMenuProps {
  isRunning: boolean;
  setViewDetails: Dispatch<SetStateAction<boolean>>;
  pollDataWithOption: PollDataWithOption;
}

const PollActionsMenu = ({
  isRunning,
  setViewDetails,
  pollDataWithOption,
}: PollActionsMenuProps) => {
  const { t } = useTranslation();
  const { endPoll, isEndingPoll } = useEndPoll();
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = () => {
    setIsPublishing(true);
    publishPollResultByChat(pollDataWithOption).finally(() => {
      setIsPublishing(false);
    });
  };

  return (
    <Menu as="div">
      {({ open }) => (
        <>
          <MenuButton className="relative shrink-0 p-2 mr-2 cursor-pointer">
            <div className="">
              <FooterMenuIconSVG />
            </div>
          </MenuButton>
          <Transition
            as="div"
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <MenuItems
              static
              className="origin-top-right z-20 absolute ltr:right-0 rtl:-left-4 mt-2 w-[244px] shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2 ring-0 focus:outline-hidden"
            >
              <MenuItem>
                <button
                  className="h-7 cursor-pointer w-full flex items-center bg-white hover:bg-Gray-50 text-sm gap-2 leading-none font-medium text-Gray-950 px-2 3xl:px-3 rounded-lg transition-all duration-300 relative"
                  onClick={() => setViewDetails(true)}
                >
                  {t('polls.view-details')}
                </button>
              </MenuItem>
              <div className="divider h-1 w-[110%] bg-Gray-50 -ml-3 my-0.5"></div>
              {isRunning ? (
                <MenuItem>
                  <button
                    onClick={() => endPoll(pollDataWithOption.pollId)}
                    disabled={isEndingPoll}
                    className="h-7 cursor-pointer w-full flex items-center bg-white hover:bg-Red-50 text-sm gap-2 leading-none font-medium text-Red-700 px-2 3xl:px-3 rounded-lg transition-all duration-300 relative disabled:opacity-50 disabled:cursor-wait"
                  >
                    {t('polls.end-poll')}
                  </button>
                </MenuItem>
              ) : (
                <MenuItem>
                  <button
                    className="h-7 cursor-pointer w-full flex items-center bg-white hover:bg-Gray-50 text-sm gap-2 leading-none font-medium text-Gray-950 px-2 3xl:px-3 rounded-lg transition-all duration-300 relative disabled:opacity-50 disabled:cursor-wait"
                    onClick={handlePublish}
                    disabled={isPublishing}
                  >
                    {t('polls.publish-result')}
                  </button>
                </MenuItem>
              )}
            </MenuItems>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default PollActionsMenu;
