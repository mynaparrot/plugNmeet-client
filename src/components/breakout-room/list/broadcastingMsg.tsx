import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBroadcastBreakoutRoomMsgMutation } from '../../../store/services/breakoutRoomApi';
import { toast } from 'react-toastify';
import { BroadcastBreakoutRoomMsgReqSchema } from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

const BroadcastingMsg = () => {
  const { t } = useTranslation();
  const [msg, setMsg] = useState<string>('');
  const [disable, setDisable] = useState<boolean>(false);
  const [broadcastMsg, { isLoading, data }] =
    useBroadcastBreakoutRoomMsgMutation();

  useEffect(() => {
    setDisable(!!isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (data) {
      if (data.status) {
        toast(t('breakout-room.broadcast-msg-success'), {
          type: 'info',
        });
        setMsg('');
      } else {
        toast(t(data.msg), {
          type: 'error',
        });
      }
    }
    //eslint-disable-next-line
  }, [data]);

  const send = () => {
    if (msg === '') {
      return;
    }
    broadcastMsg(
      create(BroadcastBreakoutRoomMsgReqSchema, {
        msg,
      }),
    );
  };

  return (
    <div className="broadcasting-message pb-4 mb-4 border-b border-solid border-Gray-200 grid gap-2">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.currentTarget.value)}
        className="border border-Gray-300 bg-white shadow-input block px-3 py-2 w-full h-20 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
      ></textarea>
      <button
        onClick={send}
        disabled={disable}
        className="h-9 ml-auto px-5 cursor-pointer text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
      >
        {t('breakout-room.broadcast-msg')}
      </button>
    </div>
  );
};

export default BroadcastingMsg;
