import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSendMsgMutation } from '../../../store/services/breakoutRoomApi';
import { toast } from 'react-toastify';

const BroadcastingMsg = () => {
  const { t } = useTranslation();
  const [msg, setMsg] = useState<string>('');
  const [disable, setDisable] = useState<boolean>(false);
  const [broadcastMsg, { isLoading, data }] = useSendMsgMutation();

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
    broadcastMsg({
      msg,
    });
  };

  return (
    <div className="">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.currentTarget.value)}
      ></textarea>
      <button onClick={send} disabled={disable}>
        {t('breakout-room.broadcast-msg')}
      </button>
    </div>
  );
};

export default BroadcastingMsg;
