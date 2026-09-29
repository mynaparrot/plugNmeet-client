import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { CommonResponseSchema, RoomEndAPIReqSchema } from 'plugnmeet-protocol-js';
import clsx from 'clsx';
import RadioOptions from '../../../helpers/ui/radioOptions';

import { store, useAppSelector } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { getNatsConn } from '../../../helpers/nats';
import Modal from '../../../helpers/ui/modal';
import ConfirmationModal from '../../../helpers/ui/confirmationModal';
import { EndMeetingIconSVG } from '../../../assets/Icons/EndMeetingIconSVG';

const EndMeetingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [alertText, setAlertText] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<'end' | 'leave'>('end');

  const { t } = useTranslation();
  const conn = getNatsConn();
  const { isAdmin, roomId, showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      isAdmin: session.currentUser?.metadata?.isAdmin,
      roomId: session.currentRoom.roomId,
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  function open() {
    if (isAdmin) {
      setAlertText(t('header.menus.alert.end').toString());
    } else {
      setAlertText(t('header.menus.alert.logout').toString());
    }

    setSelectedAction('end');
    setIsOpen(true);
  }

  const handleLeave = useCallback(async () => {
    if (isBusy) {
      return;
    }
    setIsBusy(true);
    await conn.endSession('notifications.user-logged-out');
    setIsBusy(false);
    setIsOpen(false);
  }, [isBusy, conn]);

  const handleEndMeeting = useCallback(async () => {
    if (isBusy) {
      return;
    }
    setIsBusy(true);

    const id = toast.loading(t('notifications.ending-session'), {
      type: 'info',
    });

    const body = create(RoomEndAPIReqSchema, {
      roomId: roomId,
    });
    const r = await sendAPIRequest(
      'endRoom',
      toBinary(RoomEndAPIReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    if (!res.status) {
      toast.update(id, {
        render: t(res.msg),
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } else {
      toast.dismiss(id);
    }

    setIsBusy(false);
    setIsOpen(false);
  }, [isBusy, roomId, t]);

  const isBreakoutRoom = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.isBreakoutRoom,
  );

  if (isBreakoutRoom) {
    return null;
  }

  const buttonClasses = clsx(
    'relative footer-icon cursor-pointer w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px]',
    {
      'focus-ring': true,
    },
  );
  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow',
    {
      'has-tooltip': showTooltip,
    },
  );

  const tooltipText = isAdmin ? t('header.menus.end') : t('header.menus.logout');

  const renderAdminButtons = () => (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        disabled={isBusy}
        className={clsx(
          'h-10 px-5 flex items-center justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold shadow-button-shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300',
          {
            'text-white bg-Red-400 border border-Red-600 hover:bg-Red-600':
              selectedAction === 'end',
            'primary-button bg-Blue hover:bg-white border border-[#0088CC] text-white hover:text-Gray-950':
              selectedAction === 'leave',
          },
        )}
        onClick={() => (selectedAction === 'end' ? handleEndMeeting() : handleLeave())}
      >
        {selectedAction === 'end' ? t('header.menus.end') : t('header.menus.logout')}
      </button>
      <button
        type="button"
        disabled={isBusy}
        className="h-10 px-5 w-32 flex items-center justify-center text-sm 3xl:text-base font-semibold bg-Gray-50 hover:bg-Gray-100 dark:bg-dark-secondary border border-Gray-300 dark:border-Gray-800 rounded-[15px] text-Gray-800 dark:text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setIsOpen(false)}
      >
        {t('cancel')}
      </button>
    </div>
  );

  const adminRadioOptions = [
    {
      id: 'end-meeting-option',
      value: 'end',
      label: t('header.menus.alert.end-for-everyone'),
      description: t('header.menus.alert.end-desc'),
      disabled: isBusy,
    },
    {
      id: 'leave-meeting-option',
      value: 'leave',
      label: t('header.menus.logout'),
      helpText: t('header.menus.alert.logout-desc'),
      disabled: isBusy,
    },
  ];

  return (
    <>
      <button
        type="button"
        className={buttonClasses}
        onClick={open}
        aria-label={tooltipText.toString()}
      >
        <div className={innerDivClasses}>
          <span className="tooltip tooltip-right end-0">{tooltipText}</span>
          <EndMeetingIconSVG />
        </div>
      </button>

      {isAdmin ? (
        <Modal
          show={isOpen}
          onClose={() => setIsOpen(false)}
          title={t('header.menus.alert.leave-or-end-title')}
          renderButtons={renderAdminButtons}
        >
          <RadioOptions
            options={adminRadioOptions}
            name="end-meeting-choice"
            checked={selectedAction}
            onChange={(value: 'end' | 'leave') => setSelectedAction(value)}
          />
        </Modal>
      ) : (
        <ConfirmationModal
          show={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={handleLeave}
          title={t('header.menus.alert.confirm')}
          text={alertText}
        />
      )}
    </>
  );
};

export default EndMeetingButton;
