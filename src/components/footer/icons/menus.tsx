import React, { useCallback, useMemo } from 'react';
import { Menu, MenuButton, MenuItems, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import LockSettingsModal from '../modals/lockSettingsModal';
import {
  updateDisplaySpeechSettingsModal,
  updateShowLockSettingsModal,
  updateShowManageBreakoutRoomModal,
  updateShowManageWaitingRoomModal,
  updateShowRtmpModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import RtmpModal from '../modals/rtmpModal';
import ExternalMediaPlayerModal from '../modals/externalMediaPlayer';
import ManageWaitingRoom from '../../waiting-room';
import BreakoutRoom from '../../breakout-room';
import DisplayExternalLinkModal from '../modals/displayExternalLinkModal';
import TranscriptionSettingsModal from '../../speech-to-text-service/transcription-settings-modal';
import { FooterMenuIconSVG } from '../../../assets/Icons/FooterMenuIconSVG';
import { BreakoutRoomIconSVG } from '../../../assets/Icons/BreakoutRoomIconSVG';
import { ExternalPlayerIconSVG } from '../../../assets/Icons/ExternalPlayerIconSVG';
import { PlayerIconSVG } from '../../../assets/Icons/PlayerIconSVG';
import { RoomLockIconSVG } from '../../../assets/Icons/RoomLockIconSVG';
import { RTMPIconSVG } from '../../../assets/Icons/RTMPIconSVG';
import { SharedNotepadIconSVG } from '../../../assets/Icons/SharedNotepadIconSVG';
import { SpeechIconSVG } from '../../../assets/Icons/SpeechIconSVG';
import { PollsIconSVG } from '../../../assets/Icons/PollsIconSVG';
import AdminMenuItem from './menus/menuItem';
import useSharedNotepad from './menus/hooks/useSharedNotepad';
import usePolls from './menus/hooks/usePolls';
import useMuteAll from './menus/hooks/useMuteAll';
import useExternalMediaPlayer from './menus/hooks/useExternalMediaPlayer';
import useDisplayExternalLink from './menus/hooks/useDisplayExternalLink';

const MenusIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showRtmpModal = useAppSelector(
    (state) => state.bottomIconsActivity.showRtmpModal,
  );
  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
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
  const { roomFeatures } = useMemo(() => {
    return {
      roomFeatures:
        store.getState().session.currentRoom?.metadata?.roomFeatures,
    };
  }, []);

  const { toggleSharedNotepad, sharedNotepadStatus } = useSharedNotepad();
  const { togglePolls, isActivePoll } = usePolls();
  const { muteAllUsers } = useMuteAll();
  const { toggleExternalMediaPlayer, isActiveExternalMediaPlayer } =
    useExternalMediaPlayer();
  const { toggleDisplayExternalLinkModal, isActiveDisplayExternalLink } =
    useDisplayExternalLink();

  const openLockSettingsModal = useCallback(() => {
    dispatch(updateShowLockSettingsModal(true));
  }, [dispatch]);

  const openRtmpModal = useCallback(() => {
    dispatch(updateShowRtmpModal(true));
  }, [dispatch]);

  const openManageWaitingRoomModal = useCallback(() => {
    dispatch(updateShowManageWaitingRoomModal(true));
  }, [dispatch]);

  const openSpeechServiceSettingsModal = useCallback(() => {
    dispatch(updateDisplaySpeechSettingsModal(true));
  }, [dispatch]);

  const openManageBreakoutRoomModal = useCallback(() => {
    dispatch(updateShowManageBreakoutRoomModal(true));
  }, [dispatch]);

  return (
    <>
      <div className="menu relative z-10">
        <Menu>
          {({ open }) => (
            <div>
              <MenuButton>
                <div
                  className={`footer-menu relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${open ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
                >
                  <div
                    className={`relative footer-icon flex items-center justify-center cursor-pointer w-full h-full rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow-sm transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${open ? 'bg-gray-100' : 'bg-white'}`}
                  >
                    <FooterMenuIconSVG />
                  </div>
                </div>
              </MenuButton>

              <Transition
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
                  className="origin-bottom-left z-9999 absolute mt-2 w-[300px] bottom-14 shadow-dropdown-menu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2"
                >
                  {roomFeatures?.allowRtmp && (
                    <AdminMenuItem
                      onClick={openRtmpModal}
                      isActive={isActiveRtmpBroadcasting}
                      icon={<RTMPIconSVG />}
                      text={
                        isActiveRtmpBroadcasting
                          ? t('footer.icons.stop-rtmp-broadcasting')
                          : t('footer.icons.start-rtmp-broadcasting')
                      }
                    />
                  )}
                  {roomFeatures?.externalMediaPlayerFeatures
                    ?.allowedExternalMediaPlayer && (
                    <AdminMenuItem
                      onClick={toggleExternalMediaPlayer}
                      isActive={isActiveExternalMediaPlayer}
                      icon={<PlayerIconSVG />}
                      text={
                        isActiveExternalMediaPlayer
                          ? t('footer.menus.stop-external-media-player')
                          : t('footer.menus.start-external-media-player')
                      }
                    />
                  )}
                  {roomFeatures?.displayExternalLinkFeatures?.isAllow && (
                    <AdminMenuItem
                      onClick={toggleDisplayExternalLinkModal}
                      isActive={isActiveDisplayExternalLink}
                      icon={<ExternalPlayerIconSVG />}
                      text={
                        isActiveDisplayExternalLink
                          ? t('footer.menus.stop-display-external-link')
                          : t('footer.menus.start-display-external-link')
                      }
                    />
                  )}
                  <div className="divider h-1 w-[110%] bg-Gray-50 -ml-3 my-0.5"></div>
                  {roomFeatures?.sharedNotePadFeatures
                    ?.allowedSharedNotePad && (
                    <AdminMenuItem
                      onClick={toggleSharedNotepad}
                      isActive={sharedNotepadStatus}
                      icon={<SharedNotepadIconSVG />}
                      text={
                        sharedNotepadStatus
                          ? t('footer.menus.disable-shared-notepad')
                          : t('footer.menus.enable-shared-notepad')
                      }
                    />
                  )}
                  {roomFeatures?.speechToTextTranslationFeatures?.isAllow && (
                    <AdminMenuItem
                      onClick={openSpeechServiceSettingsModal}
                      icon={<SpeechIconSVG classes="w-6 text-Blue2-800" />}
                      text={t('footer.menus.speech-to-text-settings')}
                    />
                  )}
                  {roomFeatures?.pollsFeatures?.isAllow && (
                    <AdminMenuItem
                      onClick={togglePolls}
                      isActive={isActivePoll}
                      icon={<PollsIconSVG classes="text-Blue2-800" />}
                      text={
                        isActivePoll
                          ? t('footer.menus.disable-polls')
                          : t('footer.menus.enable-polls')
                      }
                    />
                  )}
                  <div className="divider h-1 w-[110%] bg-Gray-50 -ml-3 my-0.5"></div>
                  {roomFeatures?.waitingRoomFeatures?.isActive && (
                    <AdminMenuItem
                      onClick={openManageWaitingRoomModal}
                      icon={
                        <i className="pnm-waiting-room text-primary-color  transition ease-in group-hover:text-secondary-color" />
                      }
                      text={t('footer.menus.manage-waiting-room')}
                    />
                  )}
                  {roomFeatures?.breakoutRoomFeatures?.isAllow && (
                    <AdminMenuItem
                      onClick={openManageBreakoutRoomModal}
                      icon={
                        <BreakoutRoomIconSVG classes="w-6 h-auto text-Blue2-800" />
                      }
                      text={t('footer.menus.manage-breakout-room')}
                    />
                  )}
                  <AdminMenuItem
                    onClick={muteAllUsers}
                    icon={
                      <i className="pnm-mic-mute text-primary-color transition ease-in group-hover:text-secondary-color" />
                    }
                    text={t('footer.menus.mute-all-users')}
                  />
                  <AdminMenuItem
                    onClick={openLockSettingsModal}
                    icon={<RoomLockIconSVG />}
                    text={t('footer.menus.room-lock-settings')}
                  />
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
