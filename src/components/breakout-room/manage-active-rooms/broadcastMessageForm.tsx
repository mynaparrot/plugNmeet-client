import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BroadcastBreakoutRoomMsgReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useBroadcastBreakoutRoomMsgMutation } from '../../../store/services/breakoutRoomApi';
import { BreakoutRoomMessage } from '..';

interface IBroadcastMessageFormProps {
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const BroadcastMessageForm = ({ setMessage }: IBroadcastMessageFormProps) => {
  const { t } = useTranslation();
  const [msg, setMsg] = useState<string>('');
  const [broadcastMsg, { isLoading, data, isSuccess, error }] =
    useBroadcastBreakoutRoomMsgMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        setMessage({
          text: t('breakout-room.broadcast-msg-success'),
          type: 'info',
        });
        setMsg('');
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ text: t(data.msg), type: 'error' });
      }
    } else if (error) {
      const errorMsg = (error as any)?.data?.msg ?? 'Unknown error';
      setMessage({ text: t(errorMsg), type: 'error' });
    }
  }, [isSuccess, data, error, t, setMessage]);

  const send = () => {
    if (msg.trim() === '') {
      return;
    }
    // clear previous error message
    setMessage(null);
    broadcastMsg(
      create(BroadcastBreakoutRoomMsgReqSchema, {
        msg,
      }),
    );
  };

  return (
    <div className="broadcasting-message pb-4 mb-4 border-b border-solid border-Gray-200 dark:border-Gray-800 grid gap-2">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.currentTarget.value)}
        className="border border-Gray-300 dark:border-Gray-800 bg-white dark:bg-dark-primary shadow-input block px-3 py-2 w-full h-20 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-gray-950 dark:text-white"
      ></textarea>
      <button
        onClick={send}
        disabled={isLoading || msg.trim() === ''}
        className="h-9 ml-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('breakout-room.broadcast-msg')}
      </button>
    </div>
  );
};

export default BroadcastMessageForm;
