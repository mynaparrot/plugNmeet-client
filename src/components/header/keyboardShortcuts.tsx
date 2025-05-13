import React, { Fragment } from 'react';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
  Button,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowKeyboardShortcutsModal } from '../../store/slices/roomSettingsSlice';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';

const KeyboardShortcuts = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isShowKeyboardShortcuts = useAppSelector(
    (state) => state.roomSettings.isShowKeyboardShortcuts,
  );

  const closeModal = () => {
    dispatch(updateShowKeyboardShortcutsModal(false));
  };

  const render = () => {
    return (
      <>
        <Transition appear show={isShowKeyboardShortcuts} as={Fragment}>
          <Dialog
            as="div"
            className="KeyboardShortcuts fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70"
            onClose={() => false}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="w-full max-w-2xl bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out">
                  <DialogTitle
                    as="h3"
                    className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950 mb-2"
                  >
                    <span>{t('header.keyboard-shortcuts.title')}</span>
                    <Button onClick={() => closeModal()}>
                      <PopupCloseSVGIcon classes="text-Gray-600" />
                    </Button>
                  </DialogTitle>
                  <hr />
                  <div className="mt-4">
                    <table className="border-collapse border border-slate-500 w-full">
                      <thead>
                        <tr>
                          <th className="pl-2 border-b border-r border-slate-700 text-xs sm:text-sm md:text-base">
                            <strong>
                              {t('header.keyboard-shortcuts.key-comb')}
                            </strong>
                          </th>
                          <th className="pl-2 border-b border-slate-700 text-xs sm:text-sm md:text-base">
                            <strong>
                              {t('header.keyboard-shortcuts.actions')}
                            </strong>
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
                            {t(
                              'header.keyboard-shortcuts.show-hide-lock-settings',
                            )}
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
                            {t(
                              'header.keyboard-shortcuts.show-hide-whiteboard',
                            )}
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
                  </div>
                </div>
              </TransitionChild>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  };

  return <>{isShowKeyboardShortcuts ? render() : null}</>;
};

export default KeyboardShortcuts;
