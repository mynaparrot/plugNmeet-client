// import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { store, useAppSelector } from '../../../store';
import { getNatsConn } from '../../../helpers/nats';
import { HandsIconSVG } from '../../../assets/Icons/HandsIconSVG';

const RaiseHandIcon = () => {
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const { t } = useTranslation();
  const conn = getNatsConn();

  const isActiveRaisehand = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveRaisehand,
  );
  // const [iconCSS, setIconCSS] = useState<string>('primaryColor');

  // useEffect(() => {
  //   if (isActiveRaisehand) {
  //     setIconCSS('secondaryColor');
  //   } else {
  //     setIconCSS('primaryColor dark:text-darkText');
  //   }
  // }, [isActiveRaisehand]);

  const toggleRaiseHand = async () => {
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
  };

  const render = () => {
    const room_features =
      store.getState().session.currentRoom.metadata?.roomFeatures;
    if (
      typeof room_features?.allowRaiseHand !== 'undefined' &&
      room_features?.allowRaiseHand === false
    ) {
      return null;
    }

    return (
      <div
        className={`raise-hand relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveRaisehand ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
        onClick={() => toggleRaiseHand()}
      >
        <div
          className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
            showTooltip ? 'has-tooltip' : ''
          } ${isActiveRaisehand ? 'bg-gray-100' : 'bg-white'}`}
        >
          {/* <span className="tooltip !bottom-[62px]">
          {isActiveRaisehand
            ? t('footer.icons.lower-hand')
            : t('footer.icons.raise-hand')}
        </span> */}
          <HandsIconSVG classes={'h-5 w-auto'} />
        </div>
      </div>
    );
  };

  return render();
};

export default RaiseHandIcon;
