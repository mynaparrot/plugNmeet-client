import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataMsgBodyType } from 'plugnmeet-protocol-js';

import Modal from '../../helpers/ui/modal';
import { getNatsConn } from '../../helpers/nats';
import { store } from '../../store';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { IVisibleParticipantInfo } from '../../store/slices/interfaces/participant';
import { announceSelection, eligibleParticipants, randomIndexBelow } from './utils';

const PRIMARY_BUTTON_CLASSES =
  'primary-button h-10 px-5 flex items-center justify-center whitespace-nowrap text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-Blue disabled:hover:text-white';

const SECONDARY_BUTTON_CLASSES =
  'secondary-button h-10 px-5 flex items-center justify-center whitespace-nowrap cursor-pointer text-sm font-semibold bg-white hover:bg-Blue border border-[#0088CC] rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-Gray-950';

interface IRandomPickerModalProps {
  excludeUserId?: string;
  onResult(userId: string): void;
  onClose(): void;
}

const RandomPickerModal = ({ excludeUserId, onResult, onClose }: IRandomPickerModalProps) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<IVisibleParticipantInfo>();
  const [eligibleCount, setEligibleCount] = useState<number>();
  const [isNotifying, setIsNotifying] = useState(false);
  const [error, setError] = useState<string>();
  // Synchronous guard against a double click before the disabled state renders.
  const sendingRef = useRef(false);

  const pick = () => {
    const list = eligibleParticipants(excludeUserId);
    setEligibleCount(list.length);
    setError(undefined);

    if (!list.length) {
      setResult(undefined);
      onResult('');
      return;
    }

    const picked = list[randomIndexBelow(list.length)];
    setResult(picked);
    onResult(picked.userId);
  };

  const notifySelected = async () => {
    if (!result || sendingRef.current) {
      return;
    }

    const conn = getNatsConn();
    if (!conn) {
      setError(t('left-panel.picker.notify-failed'));
      return;
    }

    // The selected participant may have left while the modal was open.
    const list = eligibleParticipants(excludeUserId);
    if (!list.some((p) => p.userId === result.userId)) {
      setResult(undefined);
      setEligibleCount(list.length);
      setError(t('left-panel.picker.participant-left'));
      onResult('');
      return;
    }

    sendingRef.current = true;
    setIsNotifying(true);
    setError(undefined);

    try {
      // Plain i18n key: the receiver's ALERT handler translates it locally.
      await conn.sendDataMessage(DataMsgBodyType.ALERT, 'left-panel.picker.alert', result.userId);
    } catch (e) {
      console.error(e);
      setError(t('left-panel.picker.notify-failed'));
      sendingRef.current = false;
      setIsNotifying(false);
      return;
    }

    try {
      await announceSelection(result.name);
    } catch (e) {
      console.error(e);
      // The participant already got the private alert, so don't make a second one
      // possible; report the partial failure through the normal notification UI.
      store.dispatch(
        addUserNotification({
          message: t('left-panel.picker.announce-failed'),
          typeOption: 'error',
        }),
      );
    }

    sendingRef.current = false;
    setIsNotifying(false);
    onClose();
  };

  const renderButtons = () => (
    <>
      <button type="button" className={SECONDARY_BUTTON_CLASSES} onClick={onClose}>
        {t('close')}
      </button>
      {result ? (
        <>
          <button
            type="button"
            disabled={isNotifying}
            className={`${PRIMARY_BUTTON_CLASSES} ms-4`}
            onClick={notifySelected}
          >
            {t('left-panel.picker.notify-selected')}
          </button>
          <button
            type="button"
            disabled={(eligibleCount ?? 0) === 0}
            className={`${SECONDARY_BUTTON_CLASSES} ms-4`}
            onClick={pick}
          >
            {t('left-panel.picker.pick-again')}
          </button>
        </>
      ) : (
        <button type="button" className={`${PRIMARY_BUTTON_CLASSES} ms-4`} onClick={pick}>
          {t('left-panel.picker.pick-participant')}
        </button>
      )}
    </>
  );

  return (
    <Modal
      show={true}
      onClose={onClose}
      title={t('left-panel.picker.title')}
      renderButtons={renderButtons}
      closeOnEscape
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className="min-h-[64px] flex flex-col justify-center"
      >
        {error ? (
          <p className="text-sm text-Red-600 dark:text-Red-400">{error}</p>
        ) : eligibleCount === 0 ? (
          <p className="text-sm text-Gray-600 dark:text-dark-text">
            {t('left-panel.picker.no-eligible')}
          </p>
        ) : result ? (
          <div className="w-full text-center">
            <p className="text-xs uppercase tracking-wide text-Gray-600 dark:text-dark-text">
              {t('left-panel.picker.selected')}
            </p>
            <p className="text-lg 3xl:text-xl font-semibold break-words text-Gray-950 dark:text-white mt-1">
              {result.name}
            </p>
          </div>
        ) : (
          <p className="text-sm text-Gray-600 dark:text-dark-text">{t('left-panel.picker.hint')}</p>
        )}
      </div>
    </Modal>
  );
};

export default React.memo(RandomPickerModal);
