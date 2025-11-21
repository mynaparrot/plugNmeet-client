import React, { useEffect, useState } from 'react';
import { isEmpty } from 'es-toolkit/compat';

import { store, useAppDispatch, useAppSelector } from '../../store';
import SpeechSettingsModal from './speech-settings-modal';
import { updateSelectedSubtitleLang } from '../../store/slices/speechServicesSlice';

import SubtitleTextsHistory from './displays/history';
import LiveSubtitle from './displays/liveSubtitle';
import { useSubtitleSpeechSynthesis } from './helpers/useSubtitleSpeechSynthesis';

const SpeechToTextService = () => {
  const dispatch = useAppDispatch();
  const transcriptionFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.transcriptionFeatures,
  );
  const { start, stop } = useSubtitleSpeechSynthesis();

  const [isOpenPopover, setIsOpenPopover] = useState<boolean>(false);
  const [enabledSpeechSynthesis, setEnabledSpeechSynthesis] = useState(false);

  // On initial mount, if no subtitle language is selected by the user,
  // we'll set it to the default language configured for the room.
  useEffect(() => {
    const state = store.getState();
    const selectedLang = state.speechServices.selectedSubtitleLang;
    const defaultSubtitleLang =
      state.session.currentRoom.metadata?.roomFeatures?.insightsFeatures
        ?.transcriptionFeatures?.defaultSubtitleLang;
    if (isEmpty(selectedLang) && defaultSubtitleLang) {
      dispatch(updateSelectedSubtitleLang(defaultSubtitleLang));
    }
    //oxlint-disable-next-line
  }, []);

  useEffect(() => {
    if (enabledSpeechSynthesis) {
      start();
    } else {
      stop();
    }
    // oxlint-disable-next-line exhaustive-deps
  }, [enabledSpeechSynthesis]);

  return (
    transcriptionFeatures &&
    transcriptionFeatures.isEnabled && (
      <div className="speechService absolute bottom-0 w-full z-20 left-0">
        <div className="wrap">
          <SpeechSettingsModal
            transcriptionFeatures={transcriptionFeatures}
            enabledSpeechSynthesis={enabledSpeechSynthesis}
            setEnabledSpeechSynthesis={setEnabledSpeechSynthesis}
          />
          <SubtitleTextsHistory isOpenPopover={setIsOpenPopover} />
        </div>
        {!isOpenPopover ? <LiveSubtitle /> : null}
      </div>
    )
  );
};

export default SpeechToTextService;
