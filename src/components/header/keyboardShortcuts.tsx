import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowKeyboardShortcutsModal } from '../../store/slices/roomSettingsSlice';
import Modal from '../../helpers/ui/modal';

const KeyboardShortcuts = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isShowKeyboardShortcuts = useAppSelector(
    (state) => state.roomSettings.isShowKeyboardShortcuts,
  );

  const closeModal = () => {
    dispatch(updateShowKeyboardShortcutsModal(false));
  };

  return (
    <Modal
      show={isShowKeyboardShortcuts}
      onClose={closeModal}
      title={
        <h3 className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2">
          <span>{t('header.keyboard-shortcuts.title')}</span>
        </h3>
      }
      maxWidth="max-w-2xl"
      customClass="KeyboardShortcuts"
    >
      <table className="border-collapse border border-slate-500 w-full">
        <thead>
          <tr>
            <th className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              <strong>{t('header.keyboard-shortcuts.key-comb')}</strong>
            </th>
            <th className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              <strong>{t('header.keyboard-shortcuts.actions')}</strong>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + m
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base ">
              {t('header.keyboard-shortcuts.mute-unmute')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + a
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.start-audio')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + o
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.leave-audio')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + v
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.start-webcam')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + x
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.leave-webcam')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + u
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.show-hide-user-list')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + c
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.show-hide-chat')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + l
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.show-hide-lock-settings')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + s
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.show-hide-settings')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + w
            </td>
            <td className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.show-hide-whiteboard')}
            </td>
          </tr>
          <tr>
            <td className="pl-2 border-r border-slate-700 text-xs sm:text-sm md:text-base">
              ctrl + alt/option + r
            </td>
            <td className="pl-2 border-slate-700 text-xs sm:text-sm md:text-base">
              {t('header.keyboard-shortcuts.show-hide-hand')}
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  );
};

export default KeyboardShortcuts;
