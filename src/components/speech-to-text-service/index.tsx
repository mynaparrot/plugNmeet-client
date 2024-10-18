import React, { useCallback, useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Track } from 'livekit-client';
import {
  SpeechRecognizer,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';

import SubtitleArea from './subtitleArea';
import { store, useAppDispatch, useAppSelector } from '../../store';

import {
  getAzureToken,
  openConnectionWithAzure,
  renewAzureToken,
} from './helpers/apiConnections';
import { cleanAzureToken } from '../../store/slices/roomSettingsSlice';
import SelectOptions, { OnCloseSelectedOptions } from './selectOptions';
import { updateSelectedSubtitleLang } from '../../store/slices/speechServicesSlice';
import SubtitleTextsHistory from './history';
import { getMediaServerConnRoom } from '../../helpers/livekit/utils';

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
  const isMicMuted = useAppSelector(
    (state) => state.bottomIconsActivity.isMicMuted,
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

  // by default, we'll select the first language as default subtitle
  useEffect(() => {
    const selectedSubtitleLang =
      store.getState().speechServices.selectedSubtitleLang;
    if (isEmpty(selectedSubtitleLang)) {
      const defaultSubtitleLang =
        store.getState().session.currentRoom.metadata?.roomFeatures
          ?.speechToTextTranslationFeatures?.defaultSubtitleLang;
      if (defaultSubtitleLang && !isEmpty(defaultSubtitleLang)) {
        dispatch(updateSelectedSubtitleLang(defaultSubtitleLang));
      }
    }
    //eslint-disable-next-line
  }, []);

  // if we've an active mic for room + speech to text on
  // sometime it make confused to user if they would like to mute/unmute
  // so, we'll do the same if a user tries to mute/unmute their room mic
  useEffect(() => {
    if (!createdMediaStream) {
      return;
    }
    createdMediaStream.getAudioTracks().forEach((t) => {
      t.enabled = !isMicMuted;
    });
  }, [createdMediaStream, isMicMuted]);

  const unsetRecognizer = useCallback(() => {
    if (recognizer) {
      try {
        recognizer.stopContinuousRecognitionAsync();
        recognizer.close();
        setRecognizer(undefined);
      } catch (e) {
        console.error(e);
      }
    }
  }, [recognizer]);

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
    //eslint-disable-next-line
  }, [recognizer]);

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
    //eslint-disable-next-line
  }, [recognizer, azureTokenInfo]);

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

        // for the beginning, we'll check if our room mic is muted or not
        if (currentRoom.localParticipant.audioTrackPublications.size) {
          currentRoom.localParticipant.audioTrackPublications.forEach((t) => {
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
        dispatch(cleanAzureToken());
      }
    };
    startConnection().then();
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
        currentRoom.localParticipant.audioTrackPublications.forEach(
          (publication) => {
            if (
              publication.track &&
              publication.track.source === Track.Source.Microphone &&
              publication.track.mediaStream
            ) {
              setMediaStream(publication.track.mediaStream);
            }
          },
        );
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
    [currentRoom.localParticipant.audioTrackPublications, recognizer],
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
