import React, { useEffect } from 'react';
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
  const [endSingleRoom, { isLoading, isSuccess, isError, data, error }] =
    useEndSingleRoomMutation();

  useEffect(() => {
    if (isSuccess && data) {
      toast(data.status ? t('breakout-room.room-ended') : t(data.msg), {
        type: data.status ? 'info' : 'error',
      });
    } else if (isError) {
      toast(t((error as any).data.msg), { type: 'error' });
    }
  }, [isSuccess, isError, data, error, t]);

  const handleEndRoom = () => {
    endSingleRoom(create(EndBreakoutRoomReqSchema, { breakoutRoomId }));
  };

  return (
    <div className="end-room-btn">
      <button
        className="h-7 ml-auto px-3 flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-Red-400 border border-Red-400 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleEndRoom}
        disabled={isLoading}
      >
        {t('breakout-room.end-room')}
      </button>
    </div>
  );
};

export default EndBtn;
