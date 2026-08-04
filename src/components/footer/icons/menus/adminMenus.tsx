import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuItem } from '@headlessui/react';

import { store, useAppDispatch, useAppSelector } from '../../../../store';
import useSharedNotepad from './hooks/useSharedNotepad';
import usePolls from './hooks/usePolls';
import useMuteAll from './hooks/useMuteAll';
import useExternalMediaPlayer from './hooks/useExternalMediaPlayer';
import useDisplayExternalLink from './hooks/useDisplayExternalLink';
import {
  updateDisplayInsightsAISettingsModal,
  updateDisplaySpeechSettingsModal,
  updateShowLockSettingsModal,
  updateShowManageBreakoutRoomModal,
  updateShowManageWaitingRoomModal,
  updateShowRtmpModal,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { RTMPIconSVG } from '../../../../assets/Icons/RTMPIconSVG';
import { PlayerIconSVG } from '../../../../assets/Icons/PlayerIconSVG';
import { ExternalPlayerIconSVG } from '../../../../assets/Icons/ExternalPlayerIconSVG';
import { SharedNotepadIconSVG } from '../../../../assets/Icons/SharedNotepadIconSVG';
import { SpeechIconSVG } from '../../../../assets/Icons/SpeechIconSVG';
import { PollsIconSVG } from '../../../../assets/Icons/PollsIconSVG';
import { BreakoutRoomIconSVG } from '../../../../assets/Icons/BreakoutRoomIconSVG';
import { RoomLockIconSVG } from '../../../../assets/Icons/RoomLockIconSVG';
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';

const AdminMenus = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
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

  const openInsightsAISettingsModal = useCallback(() => {
    dispatch(updateDisplayInsightsAISettingsModal(true));
  }, [dispatch]);

  return (
    <>
      {roomFeatures?.insightsFeatures?.isAllow &&
        roomFeatures?.insightsFeatures?.aiFeatures?.isAllow && (
          <MenuItem>
            <button
              type="button"
              onClick={openInsightsAISettingsModal}
              className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
            >
              <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
                <AiIconSVG classes="w-6" />
              </span>
              {t('footer.menus.ai-settings')}
            </button>
          </MenuItem>
        )}
      {roomFeatures?.externalBroadcastingFeatures?.isAllow &&
        roomFeatures?.externalBroadcastingFeatures?.isAllowRtmp && (
          <MenuItem>
            <button
              type="button"
              onClick={openRtmpModal}
              className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
            >
              <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
                <RTMPIconSVG />
              </span>
              {isActiveRtmpBroadcasting
                ? t('footer.icons.stop-rtmp-broadcasting')
                : t('footer.icons.start-rtmp-broadcasting')}
              {isActiveRtmpBroadcasting && (
                <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
              )}
            </button>
          </MenuItem>
        )}
      {roomFeatures?.insightsFeatures?.isAllow &&
        roomFeatures?.insightsFeatures?.transcriptionFeatures?.isAllow && (
          <MenuItem>
            <button
              type="button"
              onClick={openSpeechServiceSettingsModal}
              className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
            >
              <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
                <SpeechIconSVG classes="w-6" />
              </span>
              {t('footer.menus.speech-to-text-settings')}
            </button>
          </MenuItem>
        )}
      <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-0.5"></div>
      {roomFeatures?.pollsFeatures?.isAllow && (
        <MenuItem>
          <button
            type="button"
            onClick={togglePolls}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <PollsIconSVG classes="" />
            </span>
            {isActivePoll
              ? t('footer.menus.disable-polls')
              : t('footer.menus.enable-polls')}
            {isActivePoll && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {roomFeatures?.externalMediaPlayerFeatures?.isAllow && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleExternalMediaPlayer}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <PlayerIconSVG />
            </span>
            {isActiveExternalMediaPlayer
              ? t('footer.menus.stop-external-media-player')
              : t('footer.menus.start-external-media-player')}
            {isActiveExternalMediaPlayer && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {roomFeatures?.displayExternalLinkFeatures?.isAllow && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleDisplayExternalLinkModal}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <ExternalPlayerIconSVG />
            </span>
            {isActiveDisplayExternalLink
              ? t('footer.menus.stop-display-external-link')
              : t('footer.menus.start-display-external-link')}
            {isActiveDisplayExternalLink && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      {roomFeatures?.sharedNotePadFeatures?.isAllow && (
        <MenuItem>
          <button
            type="button"
            onClick={toggleSharedNotepad}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <SharedNotepadIconSVG />
            </span>
            {sharedNotepadStatus
              ? t('footer.menus.disable-shared-notepad')
              : t('footer.menus.enable-shared-notepad')}
            {sharedNotepadStatus && (
              <div className="h-2.5 w-2.5 rounded-full bg-Blue2-600 dark:bg-Blue2-500 absolute top-1/2 -translate-y-1/2 end-3" />
            )}
          </button>
        </MenuItem>
      )}
      <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-0.5"></div>
      <MenuItem>
        <button
          type="button"
          onClick={muteAllUsers}
          className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
        >
          <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
            <i className="pnm-mic-mute" />
          </span>
          {t('footer.menus.mute-all-users')}
        </button>
      </MenuItem>
      <MenuItem>
        <button
          type="button"
          onClick={openLockSettingsModal}
          className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
        >
          <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
            <RoomLockIconSVG />
          </span>
          {t('footer.menus.room-lock-settings')}
        </button>
      </MenuItem>
      {roomFeatures?.waitingRoomFeatures?.isActive && (
        <MenuItem>
          <button
            type="button"
            onClick={openManageWaitingRoomModal}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <i className="pnm-waiting-room" />
            </span>
            {t('footer.menus.manage-waiting-room')}
          </button>
        </MenuItem>
      )}
      {roomFeatures?.breakoutRoomFeatures?.isAllow && (
        <MenuItem>
          <button
            type="button"
            onClick={openManageBreakoutRoomModal}
            className="h-10 w-full cursor-pointer flex items-center text-sm gap-2 leading-none font-medium text-Gray-950 dark:text-dark-text ps-3 pe-7 rounded-lg transition-all duration-300 relative hover:bg-Gray-50 dark:hover:bg-dark-secondary2 data-[focus]:bg-Gray-50 dark:data-[focus]:bg-dark-secondary2 focus:outline-hidden"
          >
            <span className="icon flex w-5 h-auto justify-center text-Blue2-700 dark:text-Blue2-500">
              <BreakoutRoomIconSVG classes="w-6 h-auto" />
            </span>
            {t('footer.menus.manage-breakout-room')}
          </button>
        </MenuItem>
      )}
    </>
  );
};

export default AdminMenus;
