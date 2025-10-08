import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IncreaseBreakoutRoomDurationReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useIncreaseDurationMutation } from '../../../../store/services/breakoutRoomApi';
import { BreakoutRoomMessage } from '../..';

interface IExtendTimeProps {
  breakoutRoomId: string;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}
const ExtendDuration = ({ breakoutRoomId, setMessage }: IExtendTimeProps) => {
  const { t } = useTranslation();
  const [duration, setDuration] = useState<number>(5);
  const [increaseDuration, { isLoading, isSuccess, isError, data, error }] =
    useIncreaseDurationMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        setMessage({
          text: t('breakout-room.duration-extended'),
          type: 'info',
        });
      } else {
        setMessage({ text: t(data.msg), type: 'error' });
      }
    } else if (isError) {
      const msg = (error as any)?.data?.msg ?? 'Unknown error';
      setMessage({ text: t(msg), type: 'error' });
    }
  }, [isSuccess, isError, data, error, t, setMessage]);

  const handleExtendDuration = useCallback(() => {
    if (duration > 0) {
      // clear previous error
      setMessage(null);
      increaseDuration(
        create(IncreaseBreakoutRoomDurationReqSchema, {
          breakoutRoomId: breakoutRoomId,
          duration: String(duration),
        }),
      );
    }
  }, [duration, increaseDuration, breakoutRoomId, setMessage]);

  return (
    <div className="extend-time-wrapper flex items-center gap-1">
      <input
        type="number"
        min="1"
        value={duration}
        onChange={(e) => setDuration(Number(e.currentTarget.value))}
        placeholder={t('breakout-room.extend-duration').toString()}
        className="max-w-[100px] border border-Gray-300 bg-white shadow-input block px-3 py-2 w-full h-9 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
      />
      <button
        onClick={handleExtendDuration}
        disabled={isLoading || duration <= 0}
        className="h-8 px-3 text-sm font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {t('breakout-room.extend-duration')}
      </button>
    </div>
  );
};

export default ExtendDuration;
