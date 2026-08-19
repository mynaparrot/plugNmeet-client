import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store } from '../../../store';
import { getNatsConn } from '../../../helpers/nats';
import ConfirmationModal from '../../../helpers/ui/confirmationModal';
import { EndMeetingIconSVG } from '../../../assets/Icons/EndMeetingIconSVG';

const LeaveMeetingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const { t } = useTranslation();
  const conn = getNatsConn();
  const showTooltip = useMemo(() => {
    return store.getState().session.userDeviceType === 'desktop';
  }, []);

  const onConfirm = useCallback(async () => {
    if (isBusy) {
      return;
    }
    setIsBusy(true);
    await conn.endSession('notifications.user-logged-out');
    setIsBusy(false);
    setIsOpen(false);
  }, [isBusy, conn]);

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

  const tooltipText = t('header.menus.logout');

  return (
    <>
      <button
        type="button"
        className={buttonClasses}
        onClick={() => setIsOpen(true)}
        aria-label={tooltipText.toString()}
      >
        <div className={innerDivClasses}>
          <span className="tooltip tooltip-right end-0">{tooltipText}</span>
          <EndMeetingIconSVG />
        </div>
      </button>

      <ConfirmationModal
        show={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={onConfirm}
        title={t('header.menus.alert.confirm')}
        text={t('header.menus.alert.logout')}
      />
    </>
  );
};

export default LeaveMeetingButton;
