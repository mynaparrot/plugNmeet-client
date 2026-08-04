import React, { Dispatch, SetStateAction, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
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
      {() => (
        <>
          <MenuButton className="relative shrink-0 p-2 me-2 cursor-pointer">
            <div className="">
              <FooterMenuIconSVG />
            </div>
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            transition
            className="ltr:origin-top-right rtl:origin-top-left z-20 w-[244px] shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary p-2 ring-0 focus:outline-hidden transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
          >
            <MenuItem>
              <button
                className="h-7 cursor-pointer w-full flex items-center hover:bg-Gray-50 dark:hover:bg-dark-secondary2 text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 3xl:px-3 rounded-lg transition-all duration-300 relative"
                onClick={() => setViewDetails(true)}
              >
                {t('polls.view-details')}
              </button>
            </MenuItem>
            <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-0.5"></div>
            {isRunning ? (
              <MenuItem>
                <button
                  onClick={() => endPoll(pollDataWithOption.pollId)}
                  disabled={isEndingPoll}
                  className="h-7 cursor-pointer w-full flex items-center hover:bg-Red-600 text-sm gap-2 leading-none font-medium text-Red-700 hover:text-white px-2 3xl:px-3 rounded-lg transition-all duration-300 relative disabled:opacity-50 disabled:cursor-wait"
                >
                  {t('polls.end-poll')}
                </button>
              </MenuItem>
            ) : (
              <MenuItem>
                <button
                  className="h-7 cursor-pointer w-full flex items-center hover:bg-Gray-50 dark:hover:bg-dark-secondary2 text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-white px-2 3xl:px-3 rounded-lg transition-all duration-300 relative disabled:opacity-50 disabled:cursor-wait"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {t('polls.publish-result')}
                </button>
              </MenuItem>
            )}
          </MenuItems>
        </>
      )}
    </Menu>
  );
};

export default PollActionsMenu;
