import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

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
    increaseDuration({
      breakout_room_id: breakoutRoomId,
      duration,
    });
  };

  return (
    <div className="">
      <input
        value={duration}
        onChange={(e) => setDuration(Number(e.currentTarget.value))}
        placeholder={t('breakout-room.extend-duration')}
      />
      <button onClick={extendDuration} disabled={disable}>
        {t('breakout-room.extend-duration')}
      </button>
    </div>
  );
};

export default ExtendDuration;
