import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useEndSingleRoomMutation } from '../../../../store/services/breakoutRoomApi';
import { EndBreakoutRoomReq } from '../../../../helpers/proto/plugnmeet_breakout_room_pb';

interface IEndBtnProps {
  breakoutRoomId: string;
}
const EndBtn = ({ breakoutRoomId }: IEndBtnProps) => {
  const { t } = useTranslation();
  const [endSingleRoom, { isLoading, data }] = useEndSingleRoomMutation();
  const [disable, setDisable] = useState<boolean>(false);

  useEffect(() => {
    setDisable(!!isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (data) {
      if (data.status) {
        toast(t('breakout-room.room-ended'), {
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

  const endRoom = () => {
    endSingleRoom(new EndBreakoutRoomReq({ breakoutRoomId }));
  };

  return (
    <div className="end-room-btn">
      <button
        className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-brandRed hover:bg-brandRed/90 text-white font-semibold rounded-lg"
        onClick={endRoom}
        disabled={disable}
      >
        {t('breakout-room.end-room')}
      </button>
    </div>
  );
};

export default EndBtn;
