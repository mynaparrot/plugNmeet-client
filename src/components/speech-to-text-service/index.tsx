import React, { useCallback, useEffect, useState } from 'react';
import { isEmpty } from 'es-toolkit/compat';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { LocalTrackPublication, Track, TrackPublication } from 'livekit-client';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { getAzureToken, renewAzureToken } from './helpers/apiConnections';
import { cleanAzureToken } from '../../store/slices/roomSettingsSlice';
import SpeechSettingsModal, {
  OnCloseSelectedOptions,
} from './speech-settings-modal';
import { updateSelectedSubtitleLang } from '../../store/slices/speechServicesSlice';
import { getMediaServerConnRoom } from '../../helpers/livekit/utils';

import SubtitleTextsHistory from './displays/history';
import LiveSubtitle from './displays/liveSubtitle';
import { openConnectionWithAzure } from './helpers/azureSpeechService';

const tokenRenewInterval = 8 * 60 * 1000;

const SpeechToTextService = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const speechService = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures,
  );
  const azureTokenInfo = useAppSelector(
    (state) => state.roomSettings.azureTokenInfo,
  );

  const currentRoom = getMediaServerConnRoom();

  const [speechLang, setSpeechLang] = useState<string>('');
  const [recognizer, setRecognizer] = useState<
    SpeechRecognizer | TranslationRecognizer | undefined
  >(undefined);
  const [deviceId, setDeviceId] = useState<string>('');
  // this stream from livekit mic stream
  const [mediaStream, setMediaStream] = useState<MediaStream | undefined>(
    undefined,
  );
  // this one we had created from either device id or stream
  const [createdMediaStream, setCreatedMediaStream] = useState<
    MediaStream | undefined
  >(undefined);
  const [optionSelectionDisabled, setOptionSelectionDisabled] =
    useState<boolean>(false);
  const [isOpenPopover, setIsOpenPopover] = useState<boolean>(false);

  // On initial mount, if no subtitle language is selected by the user,
  // we'll set it to the default language configured for the room.
  useEffect(() => {
    const state = store.getState();
    const selectedLang = state.speechServices.selectedSubtitleLang;
    const defaultSubtitleLang =
      state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures?.defaultSubtitleLang;
    if (isEmpty(selectedLang) && defaultSubtitleLang) {
      dispatch(updateSelectedSubtitleLang(defaultSubtitleLang));
    }
    //oxlint-disable-next-line
  }, []);

  // if we've an active mic for room + speech to text on
  // sometime it make confused to user if they would like to mute/unmute
  // so, we'll do the same if a user tries to mute/unmute their room mic
  useEffect(() => {
    const handleMuteUnmute = (publication: TrackPublication) => {
      if (
        publication instanceof LocalTrackPublication &&
        publication.source === Track.Source.Microphone
      ) {
        if (createdMediaStream) {
          createdMediaStream.getAudioTracks().forEach((t) => {
            t.enabled = !publication.isMuted;
          });
        }
      }
    };

    //in the beginning, we'll check if our room mic is muted or not
    const localAudioTrack = currentRoom.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (localAudioTrack) {
      handleMuteUnmute(localAudioTrack);
    }

    currentRoom.localParticipant.on('trackMuted', handleMuteUnmute);
    currentRoom.localParticipant.on('trackUnmuted', handleMuteUnmute);

    return () => {
      currentRoom.localParticipant.off('trackMuted', handleMuteUnmute);
      currentRoom.localParticipant.off('trackUnmuted', handleMuteUnmute);
    };
  }, [createdMediaStream, currentRoom.localParticipant]);

  const unsetRecognizer = useCallback(() => {
    if (recognizer) {
      try {
        recognizer.stopContinuousRecognitionAsync();
        recognizer.close();
        setRecognizer(undefined);
      } catch (e) {
        console.error(e);
      }
      // This stream was created specifically for the recognizer, so we must stop its tracks
      // to release the microphone resource and turn off the browser's "in-use" indicator.
      if (createdMediaStream) {
        createdMediaStream.getTracks().forEach((t) => {
          t.stop();
        });
      }
    }
  }, [recognizer, createdMediaStream]);

  useEffect(() => {
    let interval: any = undefined;
    if (recognizer) {
      interval = setInterval(async () => {
        const res = await renewAzureToken();
        if (res && !res.status) {
          toast(t(res.msg), {
            type: 'error',
          });
        }
      }, tokenRenewInterval);
    }

    return () => {
      if (recognizer) {
        unsetRecognizer();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recognizer, unsetRecognizer, t]);

  // we'll update token
  useEffect(() => {
    if (
      recognizer &&
      azureTokenInfo &&
      azureTokenInfo.renew &&
      azureTokenInfo.token !== ''
    ) {
      recognizer.authorizationToken = azureTokenInfo.token;
      dispatch(cleanAzureToken());
    }
  }, [recognizer, azureTokenInfo, dispatch]);

  useEffect(() => {
    if (isEmpty(deviceId) && !mediaStream) {
      return;
    }
    if (isEmpty(speechLang)) {
      return;
    }
    const getToken = async () => {
      setOptionSelectionDisabled(true);
      const res = await getAzureToken();
      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
      }
      setOptionSelectionDisabled(false);
    };
    getToken().then();
  }, [deviceId, mediaStream, speechLang, t]);

  useEffect(() => {
    if (isEmpty(deviceId) && !mediaStream) {
      return;
    }
    const startConnection = async () => {
      if (
        speechService &&
        azureTokenInfo &&
        !azureTokenInfo.renew &&
        !isEmpty(azureTokenInfo.token) &&
        !isEmpty(speechLang)
      ) {
        setOptionSelectionDisabled(true);
        let mStream = mediaStream;
        // we'll create media stream otherwise won't be able to mute audio stream
        if (!isEmpty(deviceId) && !mediaStream) {
          // use livekit track creation method for simplicity
          const m = await currentRoom.localParticipant.createTracks({
            audio: {
              deviceId,
            },
            video: false,
          });
          mStream = m[0].mediaStream;
        }
        setCreatedMediaStream(mStream);

        openConnectionWithAzure(
          azureTokenInfo,
          mStream,
          speechLang,
          speechService,
          setOptionSelectionDisabled,
          setRecognizer,
          unsetRecognizer,
        );
        dispatch(cleanAzureToken());
      }
    };
    startConnection().then();
  }, [
    azureTokenInfo,
    deviceId,
    mediaStream,
    speechLang,
    speechService,
    currentRoom,
    dispatch,
    unsetRecognizer,
  ]);

  const resetState = useCallback(() => {
    setSpeechLang('');
    setDeviceId('');
    setMediaStream(undefined);
    setCreatedMediaStream(undefined);
  }, []);

  const onCloseSelectedOptions = useCallback(
    (o: OnCloseSelectedOptions) => {
      dispatch(updateSelectedSubtitleLang(o.subtitleLang));

      if (!isEmpty(o.speechLang)) {
        setSpeechLang(`${o.speechLang}`);
      }
      if (!isEmpty(o.micDevice)) {
        setDeviceId(o.micDevice);
        setMediaStream(undefined);
        setCreatedMediaStream(undefined);
      } else {
        // if mic was empty then we'll fallback to room mic
        const localAudioTrack =
          currentRoom.localParticipant.getTrackPublication(
            Track.Source.Microphone,
          );
        if (localAudioTrack && localAudioTrack.track) {
          setMediaStream(localAudioTrack.track.mediaStream);
        }
      }
      if (o.stopService && recognizer) {
        unsetRecognizer();
        resetState();
      }
    },
    [
      dispatch,
      currentRoom.localParticipant,
      recognizer,
      unsetRecognizer,
      resetState,
    ],
  );

  const onOpenSelectedOptionsModal = () => {
    // If a recognizer is active, don't reset. The user might just be changing subtitle lang.
    if (!recognizer) {
      resetState();
    }
  };

  return (
    speechService && (
      <div className="speechService absolute bottom-0 w-full z-20 left-0">
        <div className="wrap">
          <SpeechSettingsModal
            optionSelectionDisabled={optionSelectionDisabled}
            speechService={speechService}
            recognizer={recognizer}
            onCloseSelectedOptions={onCloseSelectedOptions}
            onOpenSelectedOptionsModal={onOpenSelectedOptionsModal}
          />
          <SubtitleTextsHistory isOpenPopover={setIsOpenPopover} />
        </div>
        {!isOpenPopover ? <LiveSubtitle /> : null}
      </div>
    )
  );
};

export default SpeechToTextService;
