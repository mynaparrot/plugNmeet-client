import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useIncreaseDurationMutation } from '../../../../store/services/breakoutRoomApi';
import { IncreaseBreakoutRoomDurationReq } from '../../../../helpers/proto/plugnmeet_breakout_room_pb';

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
      new IncreaseBreakoutRoomDurationReq({
        breakoutRoomId: breakoutRoomId,
        duration: BigInt(duration),
      }),
    );
  };

  return (
    <div className="extend-time-wrapper flex items-center mr-2 mb-2">
      <input
        value={duration}
        onChange={(e) => setDuration(Number(e.currentTarget.value))}
        placeholder={t('breakout-room.extend-duration').toString()}
        className="w-full max-w-[100px] sm:max-w-[140px] block outline-none border border-solid border-secondaryColor rounded py-1 px-2 h-9 bg-transparent dark:text-darkText dark:border-darkText"
      />
      <button
        onClick={extendDuration}
        disabled={disable}
        className="ml-2 sm:ml-4 w-[180px] text-center py-1 px-3 h-8 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
      >
        {t('breakout-room.extend-duration')}
      </button>
    </div>
  );
};

export default ExtendDuration;
