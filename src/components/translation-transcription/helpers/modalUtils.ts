export interface IValidationResult {
  isValid: boolean;
  message?: string;
}

export interface IValidationParams {
  selectedSpeechUsers: string[];
  selectedSpeechLangs: string[];
  enableTranslation: boolean;
  selectedTransLangs: string[];
}

export const validateSettings = ({
  selectedSpeechUsers,
  selectedSpeechLangs,
  enableTranslation,
  selectedTransLangs,
}: IValidationParams): IValidationResult => {
  if (selectedSpeechUsers.length === 0) {
    return { isValid: false, message: 'speech-services.speech-user-required' };
  }
  if (selectedSpeechLangs.length === 0) {
    return { isValid: false, message: 'speech-services.speech-lang-required' };
  }
  if (!enableTranslation && selectedSpeechLangs.length > 1) {
    return {
      isValid: false,
      message: 'speech-services.enable-translation-warning',
    };
  }
  if (
    enableTranslation &&
    selectedSpeechLangs.length === 1 &&
    selectedTransLangs.length === 0
  ) {
    return {
      isValid: false,
      message: 'speech-services.translation-lang-required',
    };
  }
  return { isValid: true };
};
