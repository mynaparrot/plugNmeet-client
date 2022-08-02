import React, { useState, useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { Room } from 'livekit-client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { updateIsActiveRaisehand } from '../../../store/slices/bottomIconsActivitySlice';
import { SystemMsgType } from '../../../store/slices/interfaces/dataMessages';

interface IRaiseHandIconProps {
  currentRoom: Room;
}

const isActiveRaisehandSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveRaisehand,
  (isActiveRaisehand) => isActiveRaisehand,
);

const RaiseHandIcon = ({ currentRoom }: IRaiseHandIconProps) => {
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
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
    if (!isActiveRaisehand) {
      const body = {
        sid: currentRoom.sid,
        room_id: currentRoom.name,
        msg_type: SystemMsgType.RAISE_HAND,
        msg: t('footer.notice.has-raised-hand', {
          user: currentRoom.localParticipant.name,
        }),
      };

      const res = await sendAPIRequest('dataMessage', body);
      if (res.status) {
        dispatch(updateIsActiveRaisehand(true));

        toast(t('footer.notice.you-raised-hand'), {
          type: 'info',
        });
      } else {
        toast(res.msg, {
          type: 'error',
        });
      }
    } else {
      const body = {
        sid: currentRoom.sid,
        room_id: currentRoom.name,
        msg_type: SystemMsgType.LOWER_HAND,
        msg: SystemMsgType.LOWER_HAND,
      };

      const res = await sendAPIRequest('dataMessage', body);
      if (res.status) {
        dispatch(updateIsActiveRaisehand(false));
      } else {
        toast(res.msg, {
          type: 'error',
        });
      }
    }
  };

  return (
    <div
      className={`hands footer-icon h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] overflow-hidden rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
        showTooltip ? 'has-tooltip' : ''
      }`}
      onClick={() => toggleRaiseHand()}
    >
      <span className="tooltip rounded shadow-lg p-1 bg-gray-100 dark:bg-darkSecondary2 text-red-500 dark:text-darkText -mt-16 text-[10px] w-max">
        {isActiveRaisehand
          ? t('footer.icons.lower-hand')
          : t('footer.icons.raise-hand')}
      </span>
      <i className={`pnm-raise-hand ${iconCSS} text-[12px] lg:text-[16px]`} />
    </div>
  );
};

export default RaiseHandIcon;
