import React, { useState, useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Room, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import ShareMicrophoneModal from '../modals/shareMicrophone';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateShowMicrophoneModal,
} from '../../../store/slices/bottomIconsActivitySlice';
import MicMenu from './mic-menu';
import { participantsSelector } from '../../../store/slices/participantSlice';

interface IMicrophoneIconProps {
  currentRoom: Room;
}
const isActiveMicrophoneSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveMicrophone,
  (isActiveMicrophone) => isActiveMicrophone,
);

const showMicrophoneModalSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.showMicrophoneModal,
  (showMicrophoneModal) => showMicrophoneModal,
);

const isMicLockSelector = createSelector(
  (state: RootState) =>
    state.session.currenUser?.metadata?.lock_settings.lock_microphone,
  (lock_microphone) => lock_microphone,
);

const MicrophoneIcon = ({ currentRoom }: IMicrophoneIconProps) => {
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();

  const showMicrophoneModal = useAppSelector(showMicrophoneModalSelector);
  const isActiveMicrophone = useAppSelector(isActiveMicrophoneSelector);
  const isMicLock = useAppSelector(isMicLockSelector);

  const [lockMic, setLockMic] = useState<boolean>(false);

  // for change in mic lock setting
  useEffect(() => {
    const closeMicOnLock = () => {
      currentRoom?.localParticipant.audioTracks.forEach((publication) => {
        if (
          publication.track &&
          publication.source === Track.Source.Microphone
        ) {
          currentRoom.localParticipant.unpublishTrack(publication.track);
        }
      });
      dispatch(updateIsActiveMicrophone(false));
      dispatch(updateIsMicMuted(false));
    };

    if (isMicLock) {
      setLockMic(true);

      const currentUser = participantsSelector.selectById(
        store.getState(),
        currentRoom.localParticipant.identity,
      );
      if (currentUser?.audioTracks) {
        closeMicOnLock();
      }
    } else {
      setLockMic(false);
    }
  }, [isMicLock, currentRoom, dispatch]);

  // default room lock settings
  useEffect(() => {
    const isLock =
      store.getState().session.currentRoom.metadata?.default_lock_settings
        ?.lock_microphone;
    const isAdmin = store.getState().session.currenUser?.metadata?.is_admin;

    if (isLock && !isAdmin) {
      if (isMicLock !== false) {
        setLockMic(true);
      }
    }
    // eslint-disable-next-line
  }, []);

  const activateMic = () => {
    if (lockMic) {
      return;
    }
    if (!isActiveMicrophone) {
      dispatch(updateShowMicrophoneModal(true));
    }
  };

  return (
    <div>
      {showMicrophoneModal ? (
        <ShareMicrophoneModal currentRoom={currentRoom} />
      ) : null}
      <div
        className={`microphone relative h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => activateMic()}
      >
        {!isActiveMicrophone ? (
          <span className="tooltip rounded shadow-lg p-1 bg-gray-100 text-red-500 -mt-16 text-[10px] w-max">
            {!lockMic
              ? t('footer.icons.start-microphone-sharing')
              : t('footer.icons.microphone-locked')}
          </span>
        ) : null}
        {!isActiveMicrophone ? (
          <React.Fragment>
            <i className="pnm-mic-unmute brand-color1 text-[10px] lg:text-[14px]" />
            {lockMic ? (
              <div className="arrow-down absolute -bottom-1 -right-1 w-[16px] h-[16px] rounded-full bg-white flex items-center justify-center">
                <i className="pnm-lock brand-color1" />
              </div>
            ) : null}
          </React.Fragment>
        ) : null}

        {isActiveMicrophone ? <MicMenu currentRoom={currentRoom} /> : null}
      </div>
    </div>
  );
};

export default MicrophoneIcon;
