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

  // in mobile sometime above solution doesn't work properly
  useEffect(() => {
    let hidden, visibilityChange;
    if (typeof document.hidden !== 'undefined') {
      // Opera 12.10 and Firefox 18 and later support
      hidden = 'hidden';
      visibilityChange = 'visibilitychange';
    } else if (typeof (document as any).msHidden !== 'undefined') {
      hidden = 'msHidden';
      visibilityChange = 'msvisibilitychange';
    } else if (typeof (document as any).webkitHidden !== 'undefined') {
      hidden = 'webkitHidden';
      visibilityChange = 'webkitvisibilitychange';
    }

    const handleVisibilityChange = () => {
      if (document[hidden]) {
        setHidden(true);
      } else {
        setHidden(false);
      }
    };

    if (
      typeof document.addEventListener !== 'undefined' ||
      hidden !== undefined
    ) {
      document.addEventListener(
        visibilityChange,
        handleVisibilityChange,
        false,
      );
    }
    return () => {
      if (
        typeof document.addEventListener !== 'undefined' ||
        hidden !== undefined
      ) {
        document.removeEventListener(visibilityChange, handleVisibilityChange);
      }
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
          sid: session.currentUser?.sid ?? '',
          userId: session.currentUser?.userId ?? '',
        },
        msg: hidden ? 'hidden' : 'visible',
      },
    };
    sendWebsocketMessage(JSON.stringify(data));
  }, [hidden]);
};

export default useWatchVisibilityChange;
