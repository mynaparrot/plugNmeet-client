import React, { useEffect, useState } from 'react';
import { createLocalTracks, ParticipantEvent, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { isEmpty } from 'lodash';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  AnalyticsStatus,
  AnalyticsStatusSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppSelector, useAppDispatch } from '../../store';
import {
  toggleStartup,
  updateMuteOnStart,
} from '../../store/slices/sessionSlice';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateShowMicrophoneModal,
} from '../../store/slices/bottomIconsActivitySlice';
import { participantsSelector } from '../../store/slices/participantSlice';
import { getAudioPreset } from '../../helpers/utils';
import { getMediaServerConnRoom } from '../../helpers/livekit/utils';
import { getNatsConn } from '../../helpers/nats';

import {
  updateRoomAudioVolume,
  updateSelectedAudioDevice,
} from '../../store/slices/roomSettingsSlice';
import { Microphone } from '../../assets/Icons/Microphone';
import { PlusIcon } from '../../assets/Icons/PlusIcon';
import { BlockedIcon } from '../../assets/Icons/BlockedIcon';
import { MicrophoneOff } from '../../assets/Icons/MicrophoneOff';
import { ArrowUp } from '../../assets/Icons/ArrowUp';
// import { Camera } from '../../assets/Icons/Camera';
import { CameraOff } from '../../assets/Icons/CameraOff';
import { Volume } from '../../assets/Icons/Volume';
import MicrophoneModal from '../footer/modals/microphoneModal';

interface StartupJoinModalProps {
  onCloseModal(): void;
}

const StartupJoinModal = ({ onCloseModal }: StartupJoinModalProps) => {
  const [open, setOpen] = useState<boolean>(true);
  const isStartup = useAppSelector((state) => state.session.isStartup);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const onClose = (noAudio = false) => {
    setOpen(false);
    dispatch(toggleStartup(false));
    if (noAudio) {
      dispatch(updateRoomAudioVolume(0));
    }
    onCloseModal();
  };
  const shareMic = () => {
    dispatch(updateShowMicrophoneModal(true));
    onClose();
  };

  // const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  // const { t } = useTranslation();
  const conn = getNatsConn();

  const session = store.getState().session;
  // const showTooltip = session.userDeviceType === 'desktop';
  const muteOnStart =
    session.currentRoom.metadata?.roomFeatures?.muteOnStart ?? false;

  const showMicrophoneModal = useAppSelector(
    (state) => state.bottomIconsActivity.showMicrophoneModal,
  );
  const isActiveMicrophone = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveMicrophone,
  );
  const isMicLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const isMicMuted = useAppSelector(
    (state) => state.bottomIconsActivity.isMicMuted,
  );

  const [lockMic, setLockMic] = useState<boolean>(false);

  // for change in mic lock setting
  useEffect(() => {
    const closeMicOnLock = async () => {
      for (const [
        ,
        publication,
        // eslint-disable-next-line no-unsafe-optional-chaining
      ] of currentRoom?.localParticipant.audioTrackPublications.entries()) {
        if (
          publication.track &&
          publication.source === Track.Source.Microphone
        ) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }

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
      store.getState().session.currentRoom.metadata?.defaultLockSettings
        ?.lockMicrophone;
    const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

    if (isLock && !isAdmin) {
      if (isMicLock !== false) {
        setLockMic(true);
      }
    }
    // eslint-disable-next-line
  }, []);

  // for speaking to send stats
  useEffect(() => {
    if (!currentRoom) {
      return;
    }
    const speakingHandler = (speaking: boolean) => {
      if (!speaking) {
        const lastSpokeAt = currentRoom.localParticipant.lastSpokeAt?.getTime();
        if (lastSpokeAt && lastSpokeAt > 0) {
          const cal = Date.now() - lastSpokeAt;
          // send analytics
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED_DURATION,
            AnalyticsEventType.USER,
            undefined,
            undefined,
            cal.toString(),
          );
        }
      } else {
        // send analytics as user has spoken
        conn.sendAnalyticsData(
          AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED,
          AnalyticsEventType.USER,
          undefined,
          undefined,
          '1',
        );
      }
    };

    currentRoom.localParticipant.on(
      ParticipantEvent.IsSpeakingChanged,
      speakingHandler,
    );
    return () => {
      currentRoom.localParticipant.off(
        ParticipantEvent.IsSpeakingChanged,
        speakingHandler,
      );
    };
    //eslint-disable-next-line
  }, [currentRoom]);

  const muteUnmuteMic = async () => {
    for (const [
      ,
      publication,
      // eslint-disable-next-line no-unsafe-optional-chaining
    ] of currentRoom?.localParticipant.audioTrackPublications.entries()) {
      if (
        publication.track &&
        publication.track.source === Track.Source.Microphone
      ) {
        if (publication.isMuted) {
          await publication.track.unmute();
          dispatch(updateIsMicMuted(false));

          // send analytics
          const val = AnalyticsStatusSchema.values[AnalyticsStatus.UNMUTED];
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            val['name'],
          );
        } else {
          await publication.track.mute();
          dispatch(updateIsMicMuted(true));

          // send analytics
          const val = AnalyticsStatusSchema.values[AnalyticsStatus.MUTED];
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            val['name'],
          );
        }
      }
    }
  };

  const manageMic = async () => {
    if (!isActiveMicrophone && !lockMic) {
      dispatch(updateShowMicrophoneModal(true));
    }

    if (isActiveMicrophone) {
      await muteUnmuteMic();
    }
  };

  // const getTooltipText = () => {
  //   if (!isActiveMicrophone && !lockMic) {
  //     return t('footer.icons.start-microphone-sharing');
  //   } else if (!isActiveMicrophone && lockMic) {
  //     return t('footer.icons.microphone-locked');
  //   }

  //   if (isActiveMicrophone && !isMicMuted) {
  //     return t('footer.menus.mute-microphone');
  //   } else if (isActiveMicrophone && isMicMuted) {
  //     return t('footer.menus.unmute-microphone');
  //   }
  // };

  const onCloseMicrophoneModal = async (deviceId?: string) => {
    dispatch(updateShowMicrophoneModal(false));

    if (isEmpty(deviceId)) {
      return;
    }

    const localTracks = await createLocalTracks({
      audio: {
        deviceId: deviceId,
      },
      video: false,
    });
    for (let i = 0; i < localTracks.length; i++) {
      const track = localTracks[i];
      if (track.kind === Track.Kind.Audio) {
        await currentRoom?.localParticipant.publishTrack(track, {
          audioPreset: getAudioPreset(),
        });
        dispatch(updateIsActiveMicrophone(true));
      }
    }
    if (muteOnStart) {
      setTimeout(async () => {
        const audioTracks =
          currentRoom?.localParticipant.audioTrackPublications;

        if (audioTracks) {
          for (const [, publication] of audioTracks.entries()) {
            if (
              publication.track &&
              publication.track.source === Track.Source.Microphone
            ) {
              if (!publication.isMuted) {
                await publication.track.mute();
                dispatch(updateIsMicMuted(true));
                // we'll disable it as it was first time only.
                dispatch(updateMuteOnStart(false));
              }
            }
          }
        }
      }, 500);
    }

    if (deviceId != null) {
      dispatch(updateSelectedAudioDevice(deviceId));
    }
  };

  const render = () => {
    return (
      <div
        id="startupJoinModal"
        className={`${
          open
            ? 'opacity-1 pointer-events-auto'
            : 'pointer-events-none opacity-0'
        } join-the-audio-popup bg-Gray-100 h-full flex items-center justify-center p-5`}
      >
        {showMicrophoneModal ? (
          <MicrophoneModal
            show={showMicrophoneModal}
            onCloseMicrophoneModal={onCloseMicrophoneModal}
          />
        ) : null}
        <div className="inner m-auto bg-Gray-50 border border-Gray-300 overflow-hidden rounded-2xl w-full max-w-5xl">
          <div className="head bg-white h-[60px] px-4 flex items-center text-Gray-950 text-lg font-medium border-b border-Gray-200">
            Microphone and camera preferences
          </div>
          <div className="wrapper bg-Gray-50 pt-11 pb-14 px-12 flex flex-wrap">
            <div className="left bg-Gray-25 shadow-box1 border border-Gray-200 p-2 w-1/2 rounded-2xl">
              <div className="camera bg-Gray-950 rounded-lg overflow-hidden h-[284px] w-full"></div>
              <div className="micro-cam-wrap flex justify-center py-5 gap-5">
                <div
                  onClick={() => manageMic()}
                  className="microphone-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950"
                >
                  <div className="w-11 h-11 relative flex items-center justify-center">
                    <Microphone />
                    {isMicMuted && isActiveMicrophone ? (
                      <MicrophoneOff />
                    ) : null}
                    {!isMicMuted && !isActiveMicrophone ? (
                      <span className="add absolute -top-2 -right-2">
                        <PlusIcon />
                      </span>
                    ) : null}
                    {lockMic ? (
                      <span className="blocked absolute -top-2 -right-2">
                        <BlockedIcon />
                      </span>
                    ) : null}
                  </div>
                  {isActiveMicrophone ? (
                    <div className="menu w-[30px] h-11 flex items-center justify-center border-l border-Gray-300">
                      <ArrowUp />
                    </div>
                  ) : null}
                </div>
                <div className="cam-wrap relative cursor-pointer shadow-IconBox border border-Gray-300 rounded-2xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-gray-200 text-Gray-950">
                  <div className="w-11 h-11 relative flex items-center justify-center">
                    {/* <Camera /> */}
                    <CameraOff />
                    <span className="add absolute -top-2 -right-2">
                      <PlusIcon />
                    </span>
                    <span className="blocked absolute -top-2 -right-2">
                      <BlockedIcon />
                    </span>
                  </div>
                  <div className="menu w-[30px] h-11 flex items-center justify-center border-l border-Gray-300">
                    <ArrowUp />
                  </div>
                </div>
              </div>
            </div>
            <div className="right w-1/2 pl-16 py-8">
              <div className="inner h-full relative">
                <div className="texts">
                  <h3 className="font-bold text-2xl text-Gray-950 leading-snug pb-2">
                    Almost there...
                  </h3>
                  <p className="text-base text-Gray-800">
                    Enable your microphone and camera for full participation, or
                    join as a listener.
                  </p>
                </div>
                <div className="buttons grid gap-3 absolute bottom-0 left-0 w-full">
                  <button
                    type="button"
                    className="w-full h-11 text-base font-semibold bg-Blue hover:bg-white border border-Gray-300 rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-box1"
                  >
                    Enable Microphone and Camera
                  </button>
                  <button
                    type="button"
                    className="w-full h-11 text-base font-semibold bg-Gray-25 hover:bg-Blue hover:text-white border border-Gray-300 rounded-[15px] flex justify-center items-center gap-2 transition-all duration-300 shadow-box1"
                    onClick={() => onClose()}
                  >
                    Continue as a listener
                    <Volume />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="popup-inner hidden bg-white dark:bg-darkPrimary/90 w-full max-w-md rounded-2xl shadow-header relative px-6 py-14">
          <button
            className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
            type="button"
            onClick={() => onClose(true)}
          >
            <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
            <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
          </button>
          <p className="text-base md:text-lg primaryColor dark:text-darkText font-normal mb-5 text-center">
            {t('app.how-to-join')}
          </p>
          <div className="btn flex justify-center">
            <button
              type="button"
              className="microphone bg-transparent ltr:mr-4 rtl:ml-4 text-center"
              onClick={() => shareMic()}
            >
              <div className="h-[40px] md:h-[60px] w-[40px] md:w-[60px] m-auto overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary3 hover:bg-[#ECF4FF] hover:dark:bg-darkSecondary2 mb-1 flex items-center justify-center cursor-pointer">
                <i className="pnm-mic-unmute primaryColor dark:text-secondaryColor text-xl" />
              </div>
              <p className="text-sm md:text-base primaryColor dark:text-darkText font-normal">
                {t('app.microphone')}
              </p>
            </button>
            <button
              type="button"
              id="listenOnlyJoin"
              className="headphone bg-transparent ltr:ml-4 rtl:mr-4 text-center"
            >
              <div
                className="camera h-[40px] md:h-[60px] w-[40px] md:w-[60px] m-auto overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary3 hover:bg-[#ECF4FF] hover:dark:bg-darkSecondary2 mb-1 flex items-center justify-center cursor-pointer"
                onClick={() => onClose()}
              >
                <i className="pnm-listen-only primaryColor dark:text-secondaryColor text-xl" />
              </div>
              <p className="text-sm md:text-base primaryColor dark:text-darkText font-normal">
                {t('app.listen-only')}
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return isStartup ? (
    <div className="z-50 w-full h-full">{render()}</div>
  ) : null;
};

export default StartupJoinModal;
