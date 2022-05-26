import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import LockSettingsModal from '../modals/lockSettingsModal';
import {
  updateIsActiveSharedNotePad,
  updateShowExternalMediaPlayerModal,
  updateShowLockSettingsModal,
  updateShowManageWaitingRoomModal,
  updateShowRtmpModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import RtmpModal from '../modals/rtmpModal';
import ExternalMediaPlayerModal from '../modals/externalMediaPlayer';
import ManageWaitingRoom from '../../waiting-room';

const showLockSettingsModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showLockSettingsModal,
  (showLockSettingsModal) => showLockSettingsModal,
);
const isActiveRtmpBroadcastingSelector = createSelector(
  (state: RootState) => state.session.isActiveRtmpBroadcasting,
  (isActiveRtmpBroadcasting) => isActiveRtmpBroadcasting,
);
const showRtmpModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showRtmpModal,
  (showRtmpModal) => showRtmpModal,
);
const sharedNotepadStatusSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.shared_note_pad_features
      .is_active,
  (is_active) => is_active,
);
const externalMediaPlayerStatusSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features
      .external_media_player_features.is_active,
  (is_active) => is_active,
);
const showExternalMediaPlayerModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showExternalMediaPlayerModal,
  (showExternalMediaPlayerModal) => showExternalMediaPlayerModal,
);
const showManageWaitingRoomModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showManageWaitingRoomModal,
  (showManageWaitingRoomModal) => showManageWaitingRoomModal,
);

const MenusIcon = () => {
  const session = store.getState().session;
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showLockSettingsModal = useAppSelector(showLockSettingsModalSelector);
  const sharedNotepadStatus = useAppSelector(sharedNotepadStatusSelector);
  const showRtmpModal = useAppSelector(showRtmpModalSelector);
  const isActiveRtmpBroadcasting = useAppSelector(
    isActiveRtmpBroadcastingSelector,
  );
  const externalMediaPlayerStatus = useAppSelector(
    externalMediaPlayerStatusSelector,
  );
  const showExternalMediaPlayerModal = useAppSelector(
    showExternalMediaPlayerModalSelector,
  );
  const showManageWaitingRoomModal = useAppSelector(
    showManageWaitingRoomModalSelector,
  );
  const roomFeatures =
    store.getState().session.currentRoom?.metadata?.room_features;

  const muteAllUsers = async () => {
    const body = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      user_id: 'all',
      muted: true,
    };
    const res = await sendAPIRequest('muteUnmuteTrack', body);

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
      store.getState().session.currentRoom.metadata?.room_features
        .shared_note_pad_features.host;

    if (!host && !sharedNotepadStatus) {
      const res = await sendAPIRequest('etherpad/create', {});
      if (res.status) {
        dispatch(updateIsActiveSharedNotePad(true));
      } else {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    } else if (host && !sharedNotepadStatus) {
      const res = await sendAPIRequest('etherpad/changeStatus', {
        room_id: store.getState().session.currentRoom.room_id,
        is_active: true,
      });
      if (res.status) {
        dispatch(updateIsActiveSharedNotePad(true));
      } else {
        toast(t(res.msg), {
          type: 'error',
        });
      }
    } else if (host && sharedNotepadStatus) {
      const res = await sendAPIRequest('etherpad/changeStatus', {
        room_id: store.getState().session.currentRoom.room_id,
        is_active: false,
      });
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
    dispatch(updateShowExternalMediaPlayerModal(true));
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

  const render = () => {
    return (
      <div className="menu relative z-10">
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button className="footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer">
                <i className="pnm-menu-horizontal primaryColor text-[3px] lg:text-[5px]" />
              </Menu.Button>

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
                <Menu.Items
                  static
                  className="origin-bottom-left sm:-left-20 right-0 sm:right-auto z-[9999] absolute mt-2 w-60 bottom-[48px] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                >
                  {roomFeatures?.allow_rtmp ? (
                    <div className="py-1" role="none">
                      <Menu.Item>
                        <button
                          className="footer-podcast-button text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-secondaryColor"
                          onClick={() => openRtmpModal()}
                        >
                          {isActiveRtmpBroadcasting ? (
                            <div className="lds-ripple">
                              <div className="border-secondaryColor"></div>
                              <div className="border-secondaryColor"></div>
                            </div>
                          ) : null}
                          <i className="pnm-broadcasting text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
                          {isActiveRtmpBroadcasting
                            ? t('footer.icons.stop-rtmp-broadcasting')
                            : t('footer.icons.start-rtmp-broadcasting')}
                        </button>
                      </Menu.Item>
                    </div>
                  ) : null}
                  <div className="py-1" role="none">
                    <Menu.Item>
                      <button
                        className="text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-secondaryColor"
                        onClick={() => muteAllUsers()}
                      >
                        <i className="pnm-mic-mute text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
                        {t('footer.menus.mute-all-users')}
                      </button>
                    </Menu.Item>
                  </div>
                  {roomFeatures?.shared_note_pad_features
                    .allowed_shared_note_pad ? (
                    <div className="py-1" role="none">
                      <Menu.Item>
                        <button
                          className="text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-secondaryColor"
                          onClick={() => toggleSharedNotepad()}
                        >
                          <i className="pnm-notepad text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
                          {sharedNotepadStatus
                            ? t('footer.menus.disable-shared-notepad')
                            : t('footer.menus.enable-shared-notepad')}
                        </button>
                      </Menu.Item>
                    </div>
                  ) : null}
                  {roomFeatures?.external_media_player_features
                    .allowed_external_media_player ? (
                    <div className="py-1" role="none">
                      <Menu.Item>
                        <button
                          className="text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-secondaryColor"
                          onClick={() => toggleExternalMediaPlayer()}
                        >
                          <i className="pnm-file-play text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
                          {externalMediaPlayerStatus
                            ? t('footer.menus.stop-external-media-player')
                            : t('footer.menus.start-external-media-player')}
                        </button>
                      </Menu.Item>
                    </div>
                  ) : null}
                  <div className="py-1" role="none">
                    <Menu.Item>
                      <button
                        className="text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-secondaryColor"
                        onClick={() => openManageWaitingRoomModal()}
                      >
                        <i className="pnm-waiting-room text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
                        {t('footer.menus.manage-waiting-room')}
                      </button>
                    </Menu.Item>
                  </div>
                  <div className="py-1" role="none">
                    <Menu.Item>
                      <button
                        className="text-gray-700 dark:text-gray-400 rounded group flex items-center py-1 lg:py-2 px-4 text-xs lg:text-sm text-left w-full transition ease-in hover:text-secondaryColor"
                        onClick={() => openLockSettingsModal()}
                      >
                        <i className="pnm-lock text-primaryColor mr-2 transition ease-in group-hover:text-secondaryColor" />
                        {t('footer.menus.room-lock-settings')}
                      </button>
                    </Menu.Item>
                  </div>
                </Menu.Items>
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
    </>
  );
};

export default MenusIcon;
