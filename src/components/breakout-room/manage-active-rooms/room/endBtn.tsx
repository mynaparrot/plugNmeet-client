import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EndBreakoutRoomReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';
import { toast } from 'react-toastify';

import { useEndSingleRoomMutation } from '../../../../store/services/breakoutRoomApi';
import { BreakoutRoomMessage } from '../..';

interface IEndBtnProps {
  breakoutRoomId: string;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}
const EndBtn = ({ breakoutRoomId, setMessage }: IEndBtnProps) => {
  const { t } = useTranslation();
  const [endSingleRoom, { isLoading, isSuccess, isError, data, error }] =
    useEndSingleRoomMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        toast(t('breakout-room.room-ended'), {
          type: 'info',
        });
        setMessage({ text: t('breakout-room.room-ended'), type: 'info' });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ text: t(data.msg), type: 'error' });
      }
      // success is handled by query cache invalidation, no toast needed.
    } else if (isError) {
      const msg = (error as any)?.data?.msg ?? 'Unknown error';
      setMessage({ text: t(msg), type: 'error' });
    }
  }, [isSuccess, isError, data, error, t, setMessage]);

  const handleEndRoom = () => {
    // clear previous error
    setMessage(null);
    endSingleRoom(create(EndBreakoutRoomReqSchema, { breakoutRoomId }));
  };

  return (
    <div className="end-room-btn">
      <button
        className="h-7 ml-auto px-3 flex items-center justify-center rounded-xl text-sm font-semibold text-white bg-Red-400 border border-Red-400 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        onClick={handleEndRoom}
        disabled={isLoading}
      >
        {t('breakout-room.end-room')}
      </button>
    </div>
  );
};

export default EndBtn;
