import { useEffect, useState } from 'react';
import { store } from '../../store';
import {
  DataMessageType,
  IDataMessage,
  SystemMsgType,
} from '../../store/slices/interfaces/dataMessages';
import { sendWebsocketMessage } from '../websocket';

const useWatchVisibilityChange = () => {
  const [hidden, setHidden] = useState<boolean>(false);

  useEffect(() => {
    const onBlur = () => {
      setHidden(true);
    };
    const onFocus = () => {
      setHidden(false);
    };

    window.addEventListener('blur', onBlur, false);
    window.addEventListener('focus', onFocus, false);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const session = store.getState().session;
    const data: IDataMessage = {
      type: DataMessageType.SYSTEM,
      room_sid: session.currentRoom.sid,
      message_id: '',
      body: {
        type: SystemMsgType.USER_VISIBILITY_CHANGE,
        from: {
          sid: session.currenUser?.sid ?? '',
          userId: session.currenUser?.userId ?? '',
        },
        msg: hidden ? 'hidden' : 'visible',
      },
    };
    sendWebsocketMessage(JSON.stringify(data));
  }, [hidden]);
};

export default useWatchVisibilityChange;
