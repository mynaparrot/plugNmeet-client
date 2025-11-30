import React, { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';

import { useAppSelector } from '../../../store';
import LockSettingsModal from '../modals/lockSettingsModal';
import RtmpModal from '../modals/rtmpModal';
import ManageWaitingRoom from '../../waiting-room';
import BreakoutRoom from '../../breakout-room';
import TranscriptionSettingsModal from '../../speech-to-text-service/transcription-settings-modal';
import { FooterMenuIconSVG } from '../../../assets/Icons/FooterMenuIconSVG';
import ExternalMediaPlayerModal from '../../external-media-player/modal';
import DisplayExternalLinkModal from '../../display-external-link/modal';
import AdminMenus from './menus/adminMenus';
import IconsInMenu from './menus/iconsInMenu';

interface MenusIconProps {
  isAdmin: boolean;
}

const MenusIcon = ({ isAdmin }: MenusIconProps) => {
  const showRtmpModal = useAppSelector(
    (state) => state.bottomIconsActivity.showRtmpModal,
  );

  const showExternalMediaPlayerModal = useAppSelector(
    (state) => state.bottomIconsActivity.showExternalMediaPlayerModal,
  );
  const showManageWaitingRoomModal = useAppSelector(
    (state) => state.bottomIconsActivity.showManageWaitingRoomModal,
  );
  const showManageBreakoutRoomModal = useAppSelector(
    (state) => state.bottomIconsActivity.showManageBreakoutRoomModal,
  );
  const showDisplayExternalLinkModal = useAppSelector(
    (state) => state.bottomIconsActivity.showDisplayExternalLinkModal,
  );
  const showLockSettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showLockSettingsModal,
  );
  const showSpeechSettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingsModal,
  );

  return (
    <>
      <div className="menu relative z-10">
        <Menu>
          {({ open }) => (
            <div>
              <MenuButton>
                <div
                  className={`footer-menu relative footer-icon cursor-pointer w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${open ? 'border-[rgba(124,206,247,0.25)] dark:border-Gray-800' : 'border-transparent'}`}
                >
                  <div
                    className={`relative footer-icon flex items-center justify-center cursor-pointer w-full h-full rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950 dark:text-white ${open ? 'bg-gray-100 dark:bg-Gray-700' : 'bg-white dark:bg-Gray-800'}`}
                  >
                    <FooterMenuIconSVG />
                  </div>
                </div>
              </MenuButton>
              <Transition
                as={Fragment}
                show={open}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-2"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-2"
              >
                <MenuItems
                  static={false}
                  className="origin-bottom-left -right-11 md:left-0 z-9999 absolute mt-2 w-[300px] bottom-14 shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2"
                  id="footer-menu"
                >
                  <div className="inner">
                    {isAdmin && (
                      <>
                        <AdminMenus />
                        <div className="divider h-1 w-[110%] bg-Gray-50 -ml-3 my-0.5"></div>
                      </>
                    )}
                    <IconsInMenu />
                  </div>
                </MenuItems>
              </Transition>
            </div>
          )}
        </Menu>
      </div>
      {showLockSettingsModal && <LockSettingsModal />}
      {showRtmpModal && <RtmpModal />}
      {showExternalMediaPlayerModal && <ExternalMediaPlayerModal />}
      {showManageWaitingRoomModal && <ManageWaitingRoom />}
      {showManageBreakoutRoomModal && <BreakoutRoom />}
      {showDisplayExternalLinkModal && <DisplayExternalLinkModal />}
      {showSpeechSettingsModal && <TranscriptionSettingsModal />}
    </>
  );
};

export default MenusIcon;
