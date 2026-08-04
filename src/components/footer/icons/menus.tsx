import React from 'react';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../store';
import LockSettingsModal from '../modals/lockSettingsModal';
import RtmpModal from '../modals/rtmpModal';
import ManageWaitingRoom from '../../waiting-room';
import BreakoutRoom from '../../breakout-room';
import { FooterMenuIconSVG } from '../../../assets/Icons/FooterMenuIconSVG';
import ExternalMediaPlayerModal from '../../external-media-player/modal';
import DisplayExternalLinkModal from '../../display-external-link/modal';
import AdminMenus from './menus/adminMenus';
import IconsInMenu from './menus/iconsInMenu';
import TranslationTranscriptionSettingModal from '../../translation-transcription/settingModal';
import InsightsAiSettingsModal from '../../insights-ai';

interface MenusIconProps {
  isAdmin: boolean;
}

const MenusIcon = ({ isAdmin }: MenusIconProps) => {
  const { t } = useTranslation();
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
  const showInsightsAISettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showInsightsAISettingsModal,
  );

  return (
    <>
      <div className="menu relative z-10 footer-main-menu">
        <Menu>
          {({ open }) => (
            <div>
              <MenuButton
                aria-label={t('footer.icons.menu').toString()}
                className="focus-ring"
              >
                <div
                  className={`footer-menu relative footer-icon cursor-pointer w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${open ? 'border-[rgba(124,206,247,0.25)] dark:border-Gray-800' : 'border-transparent'}`}
                >
                  <div
                    className={`footer-icon-bg relative footer-icon flex items-center justify-center cursor-pointer w-full h-full rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950 dark:text-white ${open ? 'bg-gray-100 dark:bg-Gray-700' : 'bg-white dark:bg-Gray-800'}`}
                  >
                    <FooterMenuIconSVG />
                  </div>
                </div>
              </MenuButton>
              <MenuItems
                unmount={false}
                anchor="top end"
                transition
                className="z-9999 w-[300px] shadow-dropdown-menu rounded-[15px] border border-Gray-100 dark:border-Gray-700 bg-white dark:bg-dark-primary p-2 focus:outline-hidden focus-ring [--anchor-gap:8px] transition ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
                id="footer-menu"
              >
                {isAdmin && <AdminMenus />}
                <div className="divider block md:hidden h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-0.5 last-one"></div>
                <IconsInMenu />
              </MenuItems>
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
      {showSpeechSettingsModal && <TranslationTranscriptionSettingModal />}
      {showInsightsAISettingsModal && <InsightsAiSettingsModal />}
    </>
  );
};

export default MenusIcon;
