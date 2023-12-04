import React, { useCallback, useEffect, useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import {
  ParticipantEvent,
  Room,
  Track,
  TrackPublication,
} from 'livekit-client';

import SubtitleArea from './subtitleArea';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';

import {
  getAzureToken,
  openConnectionWithAzure,
} from './helpers/apiConnections';
import { updateAzureTokenInfo } from '../../store/slices/roomSettingsSlice';
import SelectOptions, { OnCloseSelectedOptions } from './selectOptions';
import { updateSelectedSubtitleLang } from '../../store/slices/speechServicesSlice';
import SubtitleTextsHistory from './history';

interface SpeechToTextServiceProps {
  currentRoom: Room;
}

const speechServiceFeaturesSelector = createSelector(
  (state: RootState) => state.session.currentRoom.metadata?.room_features,
  (room_features) => room_features?.speech_to_text_translation_features,
);
const azureTokenInfoSelector = createSelector(
  (state: RootState) => state.roomSettings,
  (roomSettings) => roomSettings.azureTokenInfo,
);

const SpeechToTextService = ({ currentRoom }: SpeechToTextServiceProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const speechService = useAppSelector(speechServiceFeaturesSelector);
  const azureTokenInfo = useAppSelector(azureTokenInfoSelector);

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

  // by default, we'll select the first language as default subtitle
  useEffect(() => {
    const selectedSubtitleLang =
      store.getState().speechServices.selectedSubtitleLang;
    if (isEmpty(selectedSubtitleLang)) {
      const defaultSubtitleLang =
        store.getState().session.currentRoom.metadata?.room_features
          .speech_to_text_translation_features.default_subtitle_lang;
      if (defaultSubtitleLang && !isEmpty(defaultSubtitleLang)) {
        dispatch(updateSelectedSubtitleLang(defaultSubtitleLang));
      }
    }
    //eslint-disable-next-line
  }, []);

  const handleUserMutedMic = useCallback(
    (publication: TrackPublication) => {
      if (!createdMediaStream) {
        return;
      }
      if (publication.kind === Track.Kind.Audio) {
        createdMediaStream.getAudioTracks().forEach((t) => {
          t.enabled = !publication.isMuted;
        });
      }
    },
    [createdMediaStream],
  );

  // if we've an active mic for room + speech to text on
  // sometime it make confused to user if they would like to mute/unmute
  // so, we'll do the same if a user tries to mute/unmute their room mic
  useEffect(() => {
    currentRoom.localParticipant.on(
      ParticipantEvent.TrackMuted,
      handleUserMutedMic,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.TrackUnmuted,
      handleUserMutedMic,
    );
    return () => {
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackMuted,
        handleUserMutedMic,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackUnmuted,
        handleUserMutedMic,
      );
    };
    //eslint-disable-next-line
  }, [createdMediaStream]);

  const unsetRecognizer = useCallback(() => {
    if (recognizer) {
      try {
        recognizer.stopContinuousRecognitionAsync();
        recognizer.close();
        setRecognizer(undefined);
      } catch (e) {}
    }
  }, [recognizer]);

  useEffect(() => {
    return () => {
      if (recognizer) {
        unsetRecognizer();
      }
    };
    //eslint-disable-next-line
  }, [recognizer]);

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
    getToken();
    //eslint-disable-next-line
  }, [deviceId, mediaStream, speechLang]);

  useEffect(() => {
    if (isEmpty(deviceId) && !mediaStream) {
      return;
    }
    const startConnection = async () => {
      if (
        speechService &&
        azureTokenInfo &&
        !isEmpty(azureTokenInfo) &&
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

        // for the beginning, we'll check if our room mic is muted or not
        if (currentRoom.localParticipant.audioTracks.size) {
          currentRoom.localParticipant.audioTracks.forEach((t) => {
            if (t.isMuted && mStream) {
              mStream.getAudioTracks().forEach((t) => {
                if (t.enabled) {
                  t.enabled = false;
                }
              });
            }
          });
        }

        openConnectionWithAzure(
          azureTokenInfo,
          mStream,
          speechLang,
          speechService,
          setOptionSelectionDisabled,
          setRecognizer,
          unsetRecognizer,
        );
        dispatch(updateAzureTokenInfo(undefined));
      }
    };
    startConnection();
    //eslint-disable-next-line
  }, [azureTokenInfo, deviceId, mediaStream, speechLang, speechService]);

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
        currentRoom.localParticipant.audioTracks.forEach((publication) => {
          if (
            publication.track &&
            publication.track.source === Track.Source.Microphone &&
            publication.track.mediaStream
          ) {
            setMediaStream(publication.track.mediaStream);
          }
        });
      }
      if (o.stopService && recognizer) {
        unsetRecognizer();
        setSpeechLang('');
        setDeviceId('');
        setMediaStream(undefined);
        setCreatedMediaStream(undefined);
      }
    },
    //eslint-disable-next-line
    [currentRoom.localParticipant.audioTracks, recognizer],
  );

  const onOpenSelectedOptionsModal = () => {
    setSpeechLang('');
    setDeviceId('');
    setMediaStream(undefined);
    setCreatedMediaStream(undefined);
  };

  return (
    <>
      {speechService ? (
        <div className="speechService absolute bottom-0 w-full z-50 left-0">
          <div className="wrap">
            <SelectOptions
              optionSelectionDisabled={optionSelectionDisabled}
              speechService={speechService}
              recognizer={recognizer}
              onCloseSelectedOptions={onCloseSelectedOptions}
              onOpenSelectedOptionsModal={onOpenSelectedOptionsModal}
            />
            <SubtitleTextsHistory isOpenPopover={setIsOpenPopover} />
          </div>
          {!isOpenPopover ? <SubtitleArea /> : null}
        </div>
      ) : null}
    </>
  );
};

export default SpeechToTextService;
