import React, { Dispatch, SetStateAction, useEffect } from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import { create } from '@bufbuild/protobuf';
import { ClosePollReqSchema } from 'plugnmeet-protocol-js';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { FooterMenuIconSVG } from '../../../assets/Icons/FooterMenuIconSVG';
import { useClosePollMutation } from '../../../store/services/pollsApi';
import { PollDataWithOption, publishPollResultByChat } from '../utils';

interface TopMenuProps {
  isRunning: boolean;
  setViewDetails: Dispatch<SetStateAction<boolean>>;
  pollDataWithOption: PollDataWithOption;
}

const TopMenu = ({
  isRunning,
  setViewDetails,
  pollDataWithOption,
}: TopMenuProps) => {
  const { t } = useTranslation();
  const [closePoll, { data: closePollRes, isLoading }] = useClosePollMutation();

  const endPoll = () => {
    if (isLoading) {
      return;
    }
    closePoll(
      create(ClosePollReqSchema, {
        pollId: pollDataWithOption.pollId,
      }),
    );
  };

  useEffect(() => {
    if (closePollRes) {
      if (closePollRes.status) {
        toast(t('polls.end-poll-success'), {
          type: 'info',
        });
      } else {
        toast(t(closePollRes.msg), {
          type: 'error',
        });
      }
    }
  }, [closePollRes, t]);

  return (
    <>
      <Menu>
        {({ open }) => (
          <>
            <MenuButton className="relative flex-shrink-0 p-2 mr-2">
              <div className="">
                <FooterMenuIconSVG />
              </div>
            </MenuButton>
            <Transition
              as={'div'}
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
                className="origin-top-right z-20 absolute ltr:right-0 rtl:-left-4 mt-2 w-[244px] shadow-dropdownMenu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2 ring-0 focus:outline-none"
              >
                <MenuItem>
                  <button
                    className="h-9 3xl:h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-2 3xl:px-3 rounded-lg transition-all duration-300 relative"
                    onClick={() => setViewDetails(true)}
                  >
                    View details
                  </button>
                </MenuItem>
                <div className="divider h-1 w-[110%] bg-Gray-50 -ml-3 my-0.5"></div>
                {isRunning ? (
                  <MenuItem>
                    <button
                      onClick={endPoll}
                      className="h-9 3xl:h-11 w-full flex items-center bg-white hover:bg-Red-50 text-sm 3xl:text-base gap-2 leading-none font-medium text-Red-700 px-2 3xl:px-3 rounded-lg transition-all duration-300 relative"
                    >
                      {t('polls.end-poll')}
                    </button>
                  </MenuItem>
                ) : (
                  <MenuItem>
                    <button
                      className="h-9 3xl:h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-sm 3xl:text-base gap-2 leading-none font-medium text-Gray-950 px-2 3xl:px-3 rounded-lg transition-all duration-300 relative"
                      onClick={() =>
                        publishPollResultByChat(pollDataWithOption)
                      }
                    >
                      Publish result
                    </button>
                  </MenuItem>
                )}
              </MenuItems>
            </Transition>
          </>
        )}
      </Menu>
    </>
  );
};

export default TopMenu;
