import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../../../store';
import FooterMenuItem from './menuItem';
import {
  updateDisplaySpeechSettingOptionsModal,
  updateIsActivePollsPanel,
  updateIsActiveSharedNotePad,
  updateIsActiveWhiteboard,
} from '../../../../store/slices/bottomIconsActivitySlice';
import { WhiteBoardIconSVG } from '../../../../assets/Icons/WhiteBoardIconSVG';
import { SharedNotepadIconSVG } from '../../../../assets/Icons/SharedNotepadIconSVG';
import { PollsIconSVG } from '../../../../assets/Icons/PollsIconSVG';
import { SpeechIconSVG } from '../../../../assets/Icons/SpeechIconSVG';

const IconsInMenu = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const { roomFeatures } = useMemo(() => {
    return {
      roomFeatures:
        store.getState().session.currentRoom?.metadata?.roomFeatures,
    };
  }, []);

  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const toggleWhiteboard = useCallback(() => {
    // prevent toggling whiteboard during screen sharing
    if (store.getState().bottomIconsActivity.isActiveScreenshare) {
      return;
    }
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  }, [dispatch, isActiveWhiteboard]);

  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const toggleSharedNotePad = useCallback(() => {
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  }, [dispatch, isActiveSharedNotePad]);

  const isActivePoll = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
  );
  const isActivePollsPanel = useAppSelector(
    (state) => state.bottomIconsActivity.isActivePollsPanel,
  );
  const togglePollsPanel = useCallback(() => {
    dispatch(updateIsActivePollsPanel(!isActivePollsPanel));
  }, [dispatch, isActivePollsPanel]);

  const isActiveDisplaySpeechSettingOptionsModal = useAppSelector(
    (state) => state.bottomIconsActivity.showSpeechSettingOptionsModal,
  );
  const isEnabledSpeechToTextTranslation = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures
        ?.speechToTextTranslationFeatures?.isEnabled,
  );
  const toggleSpeechSettingOptionsModal = useCallback(() => {
    dispatch(
      updateDisplaySpeechSettingOptionsModal(
        !isActiveDisplaySpeechSettingOptionsModal,
      ),
    );
  }, [dispatch, isActiveDisplaySpeechSettingOptionsModal]);

  return (
    <>
      {roomFeatures?.whiteboardFeatures?.allowedWhiteboard && (
        <FooterMenuItem
          onClick={toggleWhiteboard}
          isActive={isActiveWhiteboard}
          icon={<WhiteBoardIconSVG />}
          text={
            isActiveWhiteboard
              ? t('footer.icons.hide-whiteboard')
              : t('footer.icons.show-whiteboard')
          }
        />
      )}
      {roomFeatures?.sharedNotePadFeatures?.isActive && (
        <FooterMenuItem
          onClick={toggleSharedNotePad}
          isActive={isActiveSharedNotePad}
          icon={<SharedNotepadIconSVG />}
          text={
            isActiveSharedNotePad
              ? t('footer.icons.hide-shared-notepad')
              : t('footer.icons.show-shared-notepad')
          }
        />
      )}
      {isActivePoll && (
        <FooterMenuItem
          onClick={togglePollsPanel}
          isActive={isActivePollsPanel}
          icon={<PollsIconSVG classes="text-Blue2-800" />}
          text={
            isActivePollsPanel
              ? t('footer.icons.hide-polls-panel')
              : t('footer.icons.show-polls-panel')
          }
        />
      )}
      {isEnabledSpeechToTextTranslation && (
        <FooterMenuItem
          onClick={toggleSpeechSettingOptionsModal}
          isActive={isActiveDisplaySpeechSettingOptionsModal}
          icon={<SpeechIconSVG classes="text-Blue2-950 h-6 w-auto" />}
          text={
            isActiveDisplaySpeechSettingOptionsModal
              ? t('footer.icons.hide-translation-settings')
              : t('footer.icons.show-translation-settings')
          }
        />
      )}
    </>
  );
};

export default IconsInMenu;
