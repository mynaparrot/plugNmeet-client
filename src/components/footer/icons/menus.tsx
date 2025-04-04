import React from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  ChangeEtherpadStatusReqSchema,
  CommonResponseSchema,
  CreateEtherpadSessionResSchema,
  ExternalDisplayLinkReqSchema,
  ExternalDisplayLinkTask,
  ExternalMediaPlayerReqSchema,
  ExternalMediaPlayerTask,
  MuteUnMuteTrackReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import LockSettingsModal from '../modals/lockSettingsModal';
import {
  updateDisplayExternalLinkRoomModal,
  updateDisplaySpeechSettingsModal,
  updateIsActiveSharedNotePad,
  updateShowExternalMediaPlayerModal,
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
import SpeechServiceSettingsModal from '../../speech-to-text-service/speech-service-settings-modal';
import { FooterMenuIconSVG } from '../../../assets/Icons/FooterMenuIconSVG';
import { BreakoutRoomIconSVG } from '../../../assets/Icons/BreakoutRoomIconSVG';
import { ExternalPlayerIconSVG } from '../../../assets/Icons/ExternalPlayerIconSVG';
import { PlayerIconSVG } from '../../../assets/Icons/PlayerIconSVG';
import { RoomLockIconSVG } from '../../../assets/Icons/RoomLockIconSVG';
import { RTMPIconSVG } from '../../../assets/Icons/RTMPIconSVG';
import { SharedNotepadIconSVG } from '../../../assets/Icons/SharedNotepadIconSVG';
import { SpeechIconSVG } from '../../../assets/Icons/SpeechIconSVG';
import { PollsIconSVG } from '../../../assets/Icons/PollsIconSVG';

const MenusIcon = () => {
  const session = store.getState().session;
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showLockSettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showLockSettingsModal,
  );
  const sharedNotepadStatus = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );
  const showRtmpModal = useAppSelector(
    (state) => state.bottomIconsActivity.showRtmpModal,
  );
  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
  );
  const isActiveExternalMediaPlayer = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
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
  const isActiveDisplayExternalLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const showDisplayExternalLinkModal = useAppSelector(
    (state) => state.bottomIconsActivity.showDisplayExternalLinkModal,
  );
  const showSpeechSettingsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingsModal,
  );
  const roomFeatures =
    store.getState().session.currentRoom?.metadata?.roomFeatures;

  const muteAllUsers = async () => {
    const body = create(MuteUnMuteTrackReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: 'all',
      muted: true,
    });

    const r = await sendAPIRequest(
      'muteUnmuteTrack',
      toBinary(MuteUnMuteTrackReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(t('footer.notice.muted-all-microphone'), {
        toastId: 'asked-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        toastId: 'asked-status',
        type: 'error',
      });
    }
  };

  const toggleSharedNotepad = async () => {
    const host =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.sharedNotePadFeatures?.host;

    if (!host && !sharedNotepadStatus) {
      const r = await sendAPIRequest(
        'etherpad/create',
        {},
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CreateEtherpadSessionResSchema, new Uint8Array(r));
      if (res.status) {
        dispatch(updateIsActiveSharedNotePad(true));
      } else {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    } else if (host && !sharedNotepadStatus) {
      const body = create(ChangeEtherpadStatusReqSchema, {
        roomId: store.getState().session.currentRoom.roomId,
        isActive: true,
      });
      const r = await sendAPIRequest(
        'etherpad/changeStatus',
        toBinary(ChangeEtherpadStatusReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CreateEtherpadSessionResSchema, new Uint8Array(r));
      if (res.status) {
        dispatch(updateIsActiveSharedNotePad(true));
      } else {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    } else if (host && sharedNotepadStatus) {
      const body = create(ChangeEtherpadStatusReqSchema, {
        roomId: store.getState().session.currentRoom.roomId,
        isActive: false,
      });
      const r = await sendAPIRequest(
        'etherpad/changeStatus',
        toBinary(ChangeEtherpadStatusReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CreateEtherpadSessionResSchema, new Uint8Array(r));
      if (res.status) {
        dispatch(updateIsActiveSharedNotePad(false));
      } else {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    }
  };

  const toggleExternalMediaPlayer = async () => {
    if (!isActiveExternalMediaPlayer) {
      if (isActiveDisplayExternalLink) {
        toast(t('notifications.need-to-disable-display-external-link'), {
          type: 'error',
        });
      } else {
        dispatch(updateShowExternalMediaPlayerModal(true));
      }
      return;
    }

    const id = toast.loading(t('please-wait'), {
      type: 'info',
    });

    const body = create(ExternalMediaPlayerReqSchema, {
      task: ExternalMediaPlayerTask.END_PLAYBACK,
    });
    const r = await sendAPIRequest(
      'externalMediaPlayer',
      toBinary(ExternalMediaPlayerReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (!res.status) {
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } else {
      toast.dismiss(id);
    }
  };

  const toggleDisplayExternalLinkModal = async () => {
    if (!isActiveDisplayExternalLink) {
      if (isActiveExternalMediaPlayer) {
        toast(t('notifications.need-to-disable-external-media-player'), {
          type: 'error',
        });
      } else {
        dispatch(updateDisplayExternalLinkRoomModal(true));
      }
      return;
    }
    const body = create(ExternalDisplayLinkReqSchema, {
      task: ExternalDisplayLinkTask.STOP_EXTERNAL_LINK,
    });

    const id = toast.loading(t('please-wait'), {
      type: 'info',
    });

    const r = await sendAPIRequest(
      'externalDisplayLink',
      toBinary(ExternalDisplayLinkReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (!res.status) {
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } else {
      toast.dismiss(id);
    }
  };

  const openLockSettingsModal = () => {
    dispatch(updateShowLockSettingsModal(true));
  };

  const openRtmpModal = () => {
    dispatch(updateShowRtmpModal(true));
  };

  const openManageWaitingRoomModal = () => {
    dispatch(updateShowManageWaitingRoomModal(true));
  };

  const openSpeechServiceSettingsModal = () => {
    dispatch(updateDisplaySpeechSettingsModal(true));
  };

  const openManageBreakoutRoomModal = () => {
    dispatch(updateShowManageBreakoutRoomModal(true));
  };

  const render = () => {
    return (
      <div className="menu relative z-10">
        <Menu>
          {({ open }) => (
            <>
              <MenuButton
                className={`share-screen relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border[3px] 3xl:border-4 ${open ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
              >
                <div
                  className={`relative footer-icon flex items-center justify-center cursor-pointer w-full h-full rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${open ? 'bg-gray-100' : 'bg-white'}`}
                >
                  <FooterMenuIconSVG />
                </div>
              </MenuButton>

              {/* Use the Transition component. */}
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                {/* Mark this component as `static` */}
                <MenuItems
                  static
                  className="origin-bottom-left z-[9999] absolute mt-2 w-[300px] bottom-14 shadow-dropdownMenu rounded-[15px] overflow-hidden border border-Gray-100 bg-white p-2"
                >
                  {roomFeatures?.allowRtmp ? (
                    <MenuItem>
                      <button
                        onClick={() => openRtmpModal()}
                        className="h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative"
                      >
                        {/* {isActiveRtmpBroadcasting ? (
                          <div className="lds-ripple">
                            <div className="border-secondaryColor"></div>
                            <div className="border-secondaryColor"></div>
                          </div>
                        ) : null} */}
                        <RTMPIconSVG />
                        {isActiveRtmpBroadcasting
                          ? t('footer.icons.stop-rtmp-broadcasting')
                          : t('footer.icons.start-rtmp-broadcasting')}
                        {isActiveRtmpBroadcasting ? (
                          <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                        ) : null}
                      </button>
                    </MenuItem>
                  ) : null}
                  {roomFeatures?.externalMediaPlayerFeatures
                    ?.allowedExternalMediaPlayer ? (
                    <MenuItem>
                      <button
                        className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                        onClick={() => toggleExternalMediaPlayer()}
                      >
                        <PlayerIconSVG />
                        {isActiveExternalMediaPlayer
                          ? t('footer.menus.stop-external-media-player')
                          : t('footer.menus.start-external-media-player')}
                        {isActiveExternalMediaPlayer ? (
                          <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                        ) : null}
                      </button>
                    </MenuItem>
                  ) : null}
                  {roomFeatures?.displayExternalLinkFeatures?.isAllow ? (
                    <MenuItem>
                      <button
                        className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                        onClick={() => toggleDisplayExternalLinkModal()}
                      >
                        <ExternalPlayerIconSVG />
                        {isActiveDisplayExternalLink
                          ? t('footer.menus.stop-display-external-link')
                          : t('footer.menus.start-display-external-link')}
                        {isActiveDisplayExternalLink ? (
                          <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                        ) : null}
                      </button>
                    </MenuItem>
                  ) : null}
                  <div className="divider h-1 w-[110%] bg-Gray-50 -ml-3 my-0.5"></div>
                  {roomFeatures?.sharedNotePadFeatures?.allowedSharedNotePad ? (
                    <MenuItem>
                      <button
                        className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                        onClick={() => toggleSharedNotepad()}
                      >
                        <SharedNotepadIconSVG />
                        {sharedNotepadStatus
                          ? t('footer.menus.disable-shared-notepad')
                          : t('footer.menus.enable-shared-notepad')}
                        {/* {isActiveExternalMediaPlayer ? (
                          <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                        ) : null} */}
                      </button>
                    </MenuItem>
                  ) : null}
                  {/* {roomFeatures?.speechToTextTranslationFeatures?.isAllow ? ( */}
                  <MenuItem>
                    <button
                      className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                      onClick={() => openSpeechServiceSettingsModal()}
                    >
                      <SpeechIconSVG />
                      {t('footer.menus.speech-to-text-settings')}
                      {/* {isActiveExternalMediaPlayer ? (
                        <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                      ) : null} */}
                    </button>
                  </MenuItem>
                  {/* ) : null} */}
                  <MenuItem>
                    <button
                      className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                    >
                      <PollsIconSVG />
                      Open Polls
                      {/* {isActiveExternalMediaPlayer ? (
                        <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                      ) : null} */}
                    </button>
                  </MenuItem>
                  <div className="divider h-1 w-[110%] bg-Gray-50 -ml-3 my-0.5"></div>
                  {roomFeatures?.waitingRoomFeatures?.isActive ? (
                    <MenuItem>
                      <button
                        className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                        onClick={() => openManageWaitingRoomModal()}
                      >
                        <i className="pnm-waiting-room text-primaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor" />
                        {t('footer.menus.manage-waiting-room')}
                        {/* {isActiveExternalMediaPlayer ? (
                          <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                        ) : null} */}
                      </button>
                    </MenuItem>
                  ) : null}
                  {roomFeatures?.breakoutRoomFeatures?.isAllow ? (
                    <MenuItem>
                      <button
                        className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                        onClick={() => openManageBreakoutRoomModal()}
                      >
                        <BreakoutRoomIconSVG />
                        {t('footer.menus.manage-breakout-room')}
                        {/* {isActiveExternalMediaPlayer ? (
                          <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                        ) : null} */}
                      </button>
                    </MenuItem>
                  ) : null}
                  <MenuItem>
                    <button
                      className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                      onClick={() => muteAllUsers()}
                    >
                      <i className="pnm-mic-mute text-primaryColor ltr:mr-2 rtl:ml-2 transition ease-in group-hover:text-secondaryColor" />
                      {t('footer.menus.mute-all-users')}
                      {/* {isActiveExternalMediaPlayer ? (
                        <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                      ) : null} */}
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      className={`h-11 w-full flex items-center bg-white hover:bg-Gray-50 text-base gap-2 leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 relative`}
                      onClick={() => openLockSettingsModal()}
                    >
                      <RoomLockIconSVG />
                      {t('footer.menus.room-lock-settings')}
                      {/* {isActiveExternalMediaPlayer ? (
                        <div className="isActive absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgba(0,136,204,1)] right-3"></div>
                      ) : null} */}
                    </button>
                  </MenuItem>
                </MenuItems>
              </Transition>
            </>
          )}
        </Menu>
      </div>
    );
  };

  return (
    <>
      {render()}
      {showLockSettingsModal ? <LockSettingsModal /> : null}
      {showRtmpModal ? <RtmpModal /> : null}
      {showExternalMediaPlayerModal ? <ExternalMediaPlayerModal /> : null}
      {showManageWaitingRoomModal ? <ManageWaitingRoom /> : null}
      {showManageBreakoutRoomModal ? <BreakoutRoom /> : null}
      {showDisplayExternalLinkModal ? <DisplayExternalLinkModal /> : null}
      {showSpeechSettingsModal ? <SpeechServiceSettingsModal /> : null}
    </>
  );
};

export default MenusIcon;
