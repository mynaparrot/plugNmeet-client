import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { EndBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useEndSingleRoomMutation } from '../../../../store/services/breakoutRoomApi';

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
    endSingleRoom(create(EndBreakoutRoomReqSchema, { breakoutRoomId }));
  };

  return (
    <div className="end-room-btn">
      <button
        className="h-7 ml-auto px-3 flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-Red-400 border border-Red-400 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow"
        onClick={endRoom}
        disabled={disable}
      >
        {t('breakout-room.end-room')}
      </button>
    </div>
  );
};

export default EndBtn;
