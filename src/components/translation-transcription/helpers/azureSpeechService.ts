import { Dispatch } from 'react';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechRecognitionCanceledEventArgs,
  SpeechRecognitionEventArgs,
  SpeechRecognizer,
  SpeechTranslationConfig,
  TranslationRecognitionResult,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { toast } from 'react-toastify';
import { isEmpty } from 'es-toolkit/compat';
import {
  SpeechServiceUserStatusTasks,
  SpeechToTextTranslationFeatures,
} from 'plugnmeet-protocol-js';

import { store } from '../../../store';
import { ISession } from '../../../store/slices/interfaces/session';
import i18n from '../../../helpers/i18n';
import { SpeechTextBroadcastFormat } from '../../../store/slices/interfaces/speechServices';
import {
  AzureTokenInfo,
  broadcastSpeechToTextMsg,
  sendUserSessionStatus,
} from './apiConnections';
import { supportedSpeechToTextLangs } from './supportedLangs';

class AzureSpeechService {
  private recognizer: SpeechRecognizer | TranslationRecognizer | undefined;
  private readonly session: ISession;
  private readonly speechServiceFeatures: SpeechToTextTranslationFeatures;
  private readonly unsetRecognizer: () => void;
  private readonly setOptionSelectionDisabled: Dispatch<boolean>;
  private readonly keyId: string;

  constructor(
    speechServiceFeatures: SpeechToTextTranslationFeatures,
    unsetRecognizer: () => void,
    setOptionSelectionDisabled: Dispatch<boolean>,
    keyId: string,
  ) {
    this.session = store.getState().session;
    this.speechServiceFeatures = speechServiceFeatures;
    this.unsetRecognizer = unsetRecognizer;
    this.setOptionSelectionDisabled = setOptionSelectionDisabled;
    this.keyId = keyId;
  }

  public start = (
    azureInfo: AzureTokenInfo,
    mediaStream: MediaStream,
    speechLang: string,
    setRecognizer: Dispatch<SpeechRecognizer | TranslationRecognizer>,
  ) => {
    const audioConfig = AudioConfig.fromStreamInput(mediaStream);
    const sl = supportedSpeechToTextLangs.find((l) => l.code === speechLang);
    if (!sl) {
      toast(i18n.t('speech-services.lang-not-supported'), { type: 'error' });
      return;
    }

    const transLangs = this.calculateTranslationLangs(sl.locale, sl.code);
    const speechConfig = this.createAzureSpeechConfig(
      azureInfo,
      speechLang,
      transLangs,
    );

    if (transLangs.length) {
      this.recognizer = new TranslationRecognizer(
        speechConfig as SpeechTranslationConfig,
        audioConfig,
      );
    } else {
      this.recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    }

    this.attachAzureEventHandlers(sl.locale, transLangs);
    this.recognizer.startContinuousRecognitionAsync();
    setRecognizer(this.recognizer);
  };

  private calculateTranslationLangs = (
    sourceLocale: string,
    sourceCode: string,
  ): string[] => {
    if (!this.speechServiceFeatures.isEnabledTranslation) {
      return [];
    }

    const targetLangs = new Set<string>();

    // Add configured translation languages
    this.speechServiceFeatures.allowedTransLangs?.forEach((lang) => {
      if (lang !== sourceLocale) {
        targetLangs.add(lang);
      }
    });

    // Add locales from other allowed speech languages
    this.speechServiceFeatures.allowedSpeechLangs?.forEach((code) => {
      if (code === sourceCode) return;
      const speechObj = supportedSpeechToTextLangs.find((l) => l.code === code);
      if (speechObj && speechObj.locale !== sourceLocale) {
        targetLangs.add(speechObj.locale);
      }
    });

    return Array.from(targetLangs);
  };

  private createAzureSpeechConfig = (
    azureInfo: AzureTokenInfo,
    speechLang: string,
    transLangs: string[],
  ): SpeechConfig | SpeechTranslationConfig => {
    let config: SpeechConfig | SpeechTranslationConfig;
    if (transLangs.length) {
      config = SpeechTranslationConfig.fromAuthorizationToken(
        azureInfo.token,
        azureInfo.serviceRegion,
      );
      transLangs.forEach((l) =>
        (config as SpeechTranslationConfig).addTargetLanguage(l),
      );
    } else {
      config = SpeechConfig.fromAuthorizationToken(
        azureInfo.token,
        azureInfo.serviceRegion,
      );
    }
    config.speechRecognitionLanguage = speechLang;
    config.enableDictation();
    return config;
  };

  private attachAzureEventHandlers = (
    sourceLocale: string,
    transLangs: string[],
  ) => {
    if (!this.recognizer) return;

    this.recognizer.sessionStarted = this.onAzureSessionStarted;
    this.recognizer.sessionStopped = this.onAzureSessionStopped;
    this.recognizer.canceled = this.onAzureCanceled;
    this.recognizer.recognizing = (_: any, e: SpeechRecognitionEventArgs) =>
      this.onAzureRecognizing(e, sourceLocale, transLangs);
    this.recognizer.recognized = (_: any, e: SpeechRecognitionEventArgs) =>
      this.onAzureRecognized(e, sourceLocale, transLangs);
  };

  // Event handlers are defined as arrow functions to preserve `this` context
  private onAzureSessionStarted = async () => {
    this.setOptionSelectionDisabled(false);
    const res = await sendUserSessionStatus(
      SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_STARTED,
      this.keyId,
    );
    if (!res.status) {
      toast(i18n.t('speech-services.status-change-error', { error: res.msg }), {
        type: 'error',
      });
      if (this.recognizer) {
        this.unsetRecognizer();
      }
    } else {
      toast(i18n.t('speech-services.speech-to-text-ready'), {
        type: 'success',
        autoClose: 3000,
      });
    }
  };

  private onAzureSessionStopped = async () => {
    await sendUserSessionStatus(
      SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_ENDED,
      this.keyId,
    );
    toast(i18n.t('speech-services.speech-to-text-stopped'), {
      type: 'success',
      autoClose: 3000,
    });
  };

  private onAzureCanceled = async (
    _: any,
    e: SpeechRecognitionCanceledEventArgs,
  ) => {
    this.setOptionSelectionDisabled(false);
    await sendUserSessionStatus(
      SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_ENDED,
      this.keyId,
    );
    toast(
      i18n.t('speech-services.azure-error', {
        error: e.errorCode + ': ' + e.errorDetails,
      }),
      {
        type: 'error',
      },
    );
    this.unsetRecognizer();
  };

  private onAzureRecognizing = async (
    event: SpeechRecognitionEventArgs,
    sourceLocale: string,
    transLangs: string[],
  ) => {
    const result = event.result;
    const data: SpeechTextBroadcastFormat = {
      type: 'interim',
      from: this.session?.currentUser?.name ?? '',
      result: {
        [sourceLocale]: result.text,
      },
    };

    if (result.reason === ResultReason.TranslatingSpeech) {
      transLangs.forEach((l) => {
        const text = (result as TranslationRecognitionResult).translations.get(
          l,
        );
        if (!isEmpty(text)) {
          data.result[l] = text;
        }
      });
    }
    await broadcastSpeechToTextMsg(data);
  };

  private onAzureRecognized = async (
    event: SpeechRecognitionEventArgs,
    sourceLocale: string,
    transLangs: string[],
  ) => {
    const result = event.result;
    const data: SpeechTextBroadcastFormat = {
      type: 'final',
      from: this.session?.currentUser?.name ?? '',
      result: {
        [sourceLocale]: result.text,
      },
    };

    if (result.reason === ResultReason.TranslatedSpeech) {
      transLangs.forEach((l) => {
        const text = (result as TranslationRecognitionResult).translations.get(
          l,
        );
        if (!isEmpty(text)) {
          data.result[l] = text;
        }
      });
    }
    await broadcastSpeechToTextMsg(data);
  };
}

export const openConnectionWithAzure = (
  azureInfo: AzureTokenInfo,
  mediaStream: MediaStream | undefined,
  speechLang: string,
  speechServiceFeatures: SpeechToTextTranslationFeatures,
  setOptionSelectionDisabled: Dispatch<boolean>,
  setRecognizer: Dispatch<SpeechRecognizer | TranslationRecognizer>,
  unsetRecognizer: () => void,
) => {
  if (!mediaStream) {
    toast(i18n.t('speech-services.mic-error'), {
      type: 'error',
    });
    return;
  }

  const service = new AzureSpeechService(
    speechServiceFeatures,
    unsetRecognizer,
    setOptionSelectionDisabled,
    azureInfo.keyId,
  );
  service.start(azureInfo, mediaStream, speechLang, setRecognizer);
};
