import React, { useState, useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useTranslation } from 'react-i18next';

import { RootState, store, useAppSelector } from '../../../store';
import { getCurrentRoom } from '../../../helpers/livekit/utils';
import { getNatsConn } from '../../../helpers/nats';
import {
  NatsMsgClientToServer,
  NatsMsgClientToServerEvents,
} from '../../../helpers/proto/plugnmeet_nats_msg_pb';

const isActiveRaisehandSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity,
  (bottomIconsActivity) => bottomIconsActivity.isActiveRaisehand,
);

const RaiseHandIcon = () => {
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();
  const currentRoom = getCurrentRoom();
  const isActiveRaisehand = useAppSelector(isActiveRaisehandSelector);
  const [iconCSS, setIconCSS] = useState<string>('primaryColor');

  useEffect(() => {
    if (isActiveRaisehand) {
      setIconCSS('secondaryColor');
    } else {
      setIconCSS('primaryColor dark:text-darkText');
    }
  }, [isActiveRaisehand]);

  const toggleRaiseHand = async () => {
    const conn = getNatsConn();
    const data = new NatsMsgClientToServer();

    if (!isActiveRaisehand) {
      data.event = NatsMsgClientToServerEvents.REQ_RAISE_HAND;
      data.msg = t('footer.notice.has-raised-hand', {
        user: currentRoom.localParticipant.name,
      }).toString();
    } else {
      data.event = NatsMsgClientToServerEvents.REQ_LOWER_HAND;
    }

    await conn.sendMessageToSystemWorker(data);
  };

  const render = () => {
    const room_features =
      store.getState().session.currentRoom.metadata?.room_features;
    if (
      typeof room_features?.allow_raise_hand !== 'undefined' &&
      room_features?.allow_raise_hand === false
    ) {
      return null;
    }

    return (
      <div
        className={`hands footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] ltr:mr-3 lg:ltr:mr-6 rtl:ml-3 lg:rtl:ml-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleRaiseHand()}
      >
        <span className="tooltip !bottom-[62px]">
          {isActiveRaisehand
            ? t('footer.icons.lower-hand')
            : t('footer.icons.raise-hand')}
        </span>
        <i className={`pnm-raise-hand ${iconCSS} text-[14px] lg:text-[16px]`} />
      </div>
    );
  };

  return render();
};

export default RaiseHandIcon;
