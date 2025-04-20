import React, { useState } from 'react';
import { PollInfo } from 'plugnmeet-protocol-js';

import TotalResponses from './totalResponses';
import MyVoteStatus from './myVoteStatus';
import { useTranslation } from 'react-i18next';
import { store } from '../../../store';
import ViewDetails from '../viewDetails';
import ViewResult from '../viewResult';
import VoteForm from '../voteForm';
import {
  Menu,
  MenuButton,
  Transition,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import { FooterMenuIconSVG } from '../../../assets/Icons/FooterMenuIconSVG';

interface IPollPros {
  item: PollInfo;
}

const Poll = ({ item }: IPollPros) => {
  const { t } = useTranslation();
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const [viewDetails, setViewDetails] = useState<boolean>(false);
  const [viewResult, setViewResult] = useState<boolean>(false);

  return (
    <>
      <div className="polls-item-inner mb-4">
        <div className="head min-h-10 flex items-center justify-between w-full px-4 text-sm text-Gray-700 gap-3">
          <div className="left flex items-center gap-3">
            <span className="uppercase"> Poll 01</span>{' '}
            {item.isRunning ? (
              // t('polls.poll-running')
              <></>
            ) : (
              <div className="border border-Red-200 bg-Red-100 shadow-buttonShadow rounded-full h-[22px] px-1.5 text-xs text-Red-700 font-medium flex items-center">
                {t('polls.poll-closed')}
              </div>
            )}
          </div>
          <div className="menu relative -mr-4">
            <Menu>
              {({ open }) => (
                <>
                  <MenuButton className="relative flex-shrink-0 p-2 mr-2">
                    <div className="">
                      <FooterMenuIconSVG />
                    </div>
                  </MenuButton>

                  {/* Use the Transition component. */}
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
                      className="origin-top-right z-10 absolute ltr:right-0 rtl:-left-4 mt-2 w-[244px] shadow-dropdownMenu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2 ring-0 focus:outline-none"
                    >
                      <MenuItem>
                        <button className="h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative">
                          Menu Item
                        </button>
                      </MenuItem>
                    </MenuItems>
                  </Transition>
                </>
              )}
            </Menu>
          </div>
        </div>
        <div className="bg-white px-4 py-4 border border-Gray-200 shadow-buttonShadow rounded-xl">
          <VoteForm pollId={item.id} item={item} />
        </div>
      </div>

      <div className="wrap relative pb-7">
        <div className="poll-title text-md text-primaryColor dark:text-darkText">
          {item.question}
        </div>
        <TotalResponses pollId={item.id} />
        <div className="status absolute top-0 left-0 bg-secondaryColor text-[10px] text-white py-1 px-3 uppercase rounded-br-lg">
          {item.isRunning ? t('polls.poll-running') : t('polls.poll-closed')}
        </div>

        <div className="btn">
          {item.isRunning ? <MyVoteStatus pollId={item.id} /> : null}

          {isAdmin ? (
            <button
              onClick={() => setViewDetails(true)}
              className="absolute right-0 bottom-0 transition ease-in bg-primaryColor hover:bg-secondaryColor text-[10px] text-white pt-1 pb-[2px] px-3 uppercase rounded-tl-lg"
            >
              {t('polls.view-details')}
            </button>
          ) : null}

          {!isAdmin && !item.isRunning ? (
            <button
              onClick={() => setViewResult(true)}
              className="absolute right-0 bottom-0 transition ease-in bg-primaryColor hover:bg-secondaryColor text-[10px] text-white pt-1 pb-[2px] px-3 uppercase rounded-tl-lg"
            >
              {t('polls.view-result')}
            </button>
          ) : null}
        </div>
      </div>

      <>
        {isAdmin && viewDetails ? (
          <ViewDetails
            onCloseViewDetails={() => setViewDetails(false)}
            pollId={item.id}
            item={item}
          />
        ) : null}

        {/*only if result published*/}
        {!isAdmin && !item.isRunning && viewResult ? (
          <ViewResult
            onCloseViewResult={() => setViewResult(false)}
            pollId={item.id}
          />
        ) : null}
      </>
    </>
  );
};

export default Poll;
