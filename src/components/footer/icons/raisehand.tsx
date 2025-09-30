import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';
import clsx from 'clsx';

import { store, useAppSelector } from '../../../store';
import { getNatsConn } from '../../../helpers/nats';
import { HandsIconSVG } from '../../../assets/Icons/HandsIconSVG';

const RaiseHandIcon = () => {
  const { t } = useTranslation();
  const conn = getNatsConn();

  const { showTooltip, allowRaiseHand } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      allowRaiseHand:
        session.currentRoom.metadata?.roomFeatures?.allowRaiseHand !== false,
    };
  }, []);

  const isActiveRaisehand = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveRaisehand,
  );

  const toggleRaiseHand = useCallback(() => {
    const data = create(NatsMsgClientToServerSchema, {});

    if (!isActiveRaisehand) {
      data.event = NatsMsgClientToServerEvents.REQ_RAISE_HAND;
      data.msg = t('footer.notice.has-raised-hand', {
        user: conn.userName,
      }).toString();
    } else {
      data.event = NatsMsgClientToServerEvents.REQ_LOWER_HAND;
    }

    conn.sendMessageToSystemWorker(data);
  }, [isActiveRaisehand, conn, t]);

  if (!allowRaiseHand) {
    return null;
  }

  const wrapperClasses = clsx(
    'raise-hand relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'border-[rgba(124,206,247,0.25)] dark:border-Gray-800': isActiveRaisehand,
      'border-transparent': !isActiveRaisehand,
    },
  );

  const innerDivClasses = clsx(
    'h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 dark:text-white',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100 dark:bg-Gray-700': isActiveRaisehand,
      'bg-white dark:bg-Gray-800': !isActiveRaisehand,
    },
  );

  return (
    <div className={wrapperClasses} onClick={toggleRaiseHand}>
      <div className={innerDivClasses}>
        <span className="tooltip">
          {isActiveRaisehand
            ? t('footer.icons.lower-hand')
            : t('footer.icons.raise-hand')}
        </span>
        <HandsIconSVG classes={'h-5 w-auto'} />
      </div>
    </div>
  );
};

export default RaiseHandIcon;
