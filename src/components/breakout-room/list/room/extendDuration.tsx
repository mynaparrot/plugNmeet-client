import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IncreaseBreakoutRoomDurationReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useIncreaseDurationMutation } from '../../../../store/services/breakoutRoomApi';

interface IExtendTimeProps {
  breakoutRoomId: string;
}
const ExtendDuration = ({ breakoutRoomId }: IExtendTimeProps) => {
  const { t } = useTranslation();
  const [duration, setDuration] = useState<number>(5);
  const [disable, setDisable] = useState<boolean>(false);
  const [increaseDuration, { isLoading, data }] = useIncreaseDurationMutation();

  useEffect(() => {
    setDisable(!!isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (data) {
      if (data.status) {
        toast(t('breakout-room.duration-extended'), {
          type: 'info',
        });
      } else {
        toast(t(data.msg), {
          type: 'error',
        });
      }
    }
    //eslint-disable-next-line
  }, [data]);

  const extendDuration = () => {
    increaseDuration(
      create(IncreaseBreakoutRoomDurationReqSchema, {
        breakoutRoomId: breakoutRoomId,
        duration: String(duration),
      }),
    );
  };

  return (
    <div className="extend-time-wrapper flex items-center gap-1">
      <input
        value={duration}
        onChange={(e) => setDuration(Number(e.currentTarget.value))}
        placeholder={t('breakout-room.extend-duration').toString()}
        className="max-w-[100px] border border-Gray-300 bg-white shadow-input block px-3 py-2 w-full h-9 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
      />
      <button
        onClick={extendDuration}
        disabled={disable}
        className="h-8 px-3 text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
      >
        {t('breakout-room.extend-duration')}
      </button>
    </div>
  );
};

export default ExtendDuration;
