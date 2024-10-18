import React, { Fragment } from 'react';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowKeyboardShortcutsModal } from '../../store/slices/roomSettingsSlice';

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
            className="fixed inset-0 z-[9999] overflow-y-auto"
            onClose={() => false}
          >
            <div className="min-h-screen px-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black opacity-30" />
              </TransitionChild>

              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full max-w-xl py-6 px-4 lg:px-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-darkPrimary shadow-xl rounded-2xl">
                  <button
                    className="close-btn absolute top-8 right-6 w-[25px] h-[25px] outline-none"
                    type="button"
                    onClick={() => closeModal()}
                  >
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 rotate-45" />
                    <span className="inline-block h-[1px] w-[20px] bg-primaryColor dark:bg-darkText absolute top-0 left-0 -rotate-45" />
                  </button>

                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2"
                  >
                    {t('header.keyboard-shortcuts.title')}
                  </DialogTitle>
                  <hr />
                  <div className="mt-2">
                    <table className="border-collapse border border-slate-500 dark:border-darkText w-full">
                      <thead>
                        <tr>
                          <th className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            <strong>
                              {t('header.keyboard-shortcuts.key-comb')}
                            </strong>
                          </th>
                          <th className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            <strong>
                              {t('header.keyboard-shortcuts.actions')}
                            </strong>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + m
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base ">
                            {t('header.keyboard-shortcuts.mute-unmute')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + a
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t('header.keyboard-shortcuts.start-audio')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + o
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t('header.keyboard-shortcuts.leave-audio')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + v
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t('header.keyboard-shortcuts.start-webcam')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + x
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t('header.keyboard-shortcuts.leave-webcam')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + u
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t('header.keyboard-shortcuts.show-hide-user-list')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + c
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t('header.keyboard-shortcuts.show-hide-chat')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + l
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t(
                              'header.keyboard-shortcuts.show-hide-lock-settings',
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + s
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t('header.keyboard-shortcuts.show-hide-settings')}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-b border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + w
                          </td>
                          <td className="pl-2 border-b border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            {t(
                              'header.keyboard-shortcuts.show-hide-whiteboard',
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="pl-2 border-r border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
                            ctrl + alt/option + r
                          </td>
                          <td className="pl-2 border-slate-700 dark:border-darkText dark:text-darkText text-xs sm:text-sm md:text-base">
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
