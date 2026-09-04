import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
import MenuItemHelper from './menuItemHelper';

const AdminMenus = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
  );

  const { roomFeatures, isBreakoutRoom } = useMemo(() => {
    const currentRoom = store.getState().session.currentRoom;
    return {
      roomFeatures: currentRoom?.metadata?.roomFeatures,
      isBreakoutRoom: !!currentRoom?.metadata?.isBreakoutRoom,
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
          <MenuItemHelper
            onClick={openInsightsAISettingsModal}
            icon={<AiIconSVG classes="w-6" />}
            text={t('footer.menus.ai-settings')}
          />
        )}
      {roomFeatures?.externalBroadcastingFeatures?.isAllow &&
        roomFeatures?.externalBroadcastingFeatures?.isAllowRtmp && (
          <MenuItemHelper
            onClick={openRtmpModal}
            icon={<RTMPIconSVG />}
            text={
              isActiveRtmpBroadcasting
                ? t('footer.icons.stop-rtmp-broadcasting')
                : t('footer.icons.start-rtmp-broadcasting')
            }
            isActive={isActiveRtmpBroadcasting}
          />
        )}
      {roomFeatures?.insightsFeatures?.isAllow &&
        roomFeatures?.insightsFeatures?.transcriptionFeatures?.isAllow && (
          <MenuItemHelper
            onClick={openSpeechServiceSettingsModal}
            icon={<SpeechIconSVG classes="w-6" />}
            text={t('footer.menus.speech-to-text-settings')}
          />
        )}
      <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-0.5"></div>
      {roomFeatures?.pollsFeatures?.isAllow && (
        <MenuItemHelper
          onClick={togglePolls}
          icon={<PollsIconSVG classes="" />}
          text={
            isActivePoll
              ? t('footer.menus.disable-polls')
              : t('footer.menus.enable-polls')
          }
          isActive={isActivePoll}
        />
      )}
      {roomFeatures?.externalMediaPlayerFeatures?.isAllow && (
        <MenuItemHelper
          onClick={toggleExternalMediaPlayer}
          icon={<PlayerIconSVG />}
          text={
            isActiveExternalMediaPlayer
              ? t('footer.menus.stop-external-media-player')
              : t('footer.menus.start-external-media-player')
          }
          isActive={isActiveExternalMediaPlayer}
        />
      )}
      {roomFeatures?.displayExternalLinkFeatures?.isAllow && (
        <MenuItemHelper
          onClick={toggleDisplayExternalLinkModal}
          icon={<ExternalPlayerIconSVG />}
          text={
            isActiveDisplayExternalLink
              ? t('footer.menus.stop-display-external-link')
              : t('footer.menus.start-display-external-link')
          }
          isActive={isActiveDisplayExternalLink}
        />
      )}
      {roomFeatures?.sharedNotePadFeatures?.isAllow && (
        <MenuItemHelper
          onClick={toggleSharedNotepad}
          icon={<SharedNotepadIconSVG />}
          text={
            sharedNotepadStatus
              ? t('footer.menus.disable-shared-notepad')
              : t('footer.menus.enable-shared-notepad')
          }
          isActive={sharedNotepadStatus}
        />
      )}
      <div className="divider h-1 w-[110%] bg-Gray-50 dark:bg-Gray-700 -ms-3 my-0.5"></div>
      <MenuItemHelper
        onClick={muteAllUsers}
        icon={<i className="pnm-mic-mute" />}
        text={t('footer.menus.mute-all-users')}
      />
      <MenuItemHelper
        onClick={openLockSettingsModal}
        icon={<RoomLockIconSVG />}
        text={t('footer.menus.room-lock-settings')}
      />
      {roomFeatures?.waitingRoomFeatures?.isActive && (
        <MenuItemHelper
          onClick={openManageWaitingRoomModal}
          icon={<i className="pnm-waiting-room" />}
          text={t('footer.menus.manage-waiting-room')}
        />
      )}
      {(roomFeatures?.breakoutRoomFeatures?.isAllow || isBreakoutRoom) && (
        <MenuItemHelper
          onClick={openManageBreakoutRoomModal}
          icon={<BreakoutRoomIconSVG classes="w-6 h-auto" />}
          text={t('footer.menus.manage-breakout-room')}
        />
      )}
    </>
  );
};

export default AdminMenus;
