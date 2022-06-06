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
    <div className="broadcasting-message pb-4 mb-4 border-b border-solid border-primaryColor/50 flex flex-wrap items-end">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.currentTarget.value)}
        className="w-full sm:w-[calc(100%-12rem)] block outline-none border border-solid border-primaryColor rounded p-2 min-h-[60px]"
      ></textarea>
      <button
        onClick={send}
        disabled={disable}
        className="inline-flex w-44 sm:ml-4 mt-2 justify-center px-3 py-1 text-sm font-medium text-white bg-primaryColor rounded-md hover:bg-secondaryColor focus:outline-none"
      >
        {t('breakout-room.broadcast-msg')}
      </button>
    </div>
  );
};

export default BroadcastingMsg;
