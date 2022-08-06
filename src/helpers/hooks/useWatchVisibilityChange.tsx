import { useEffect, useState } from 'react';
import { store } from '../../store';
import { sendWebsocketMessage } from '../websocket';
import {
  DataMessage,
  DataMsgBodyType,
  DataMsgType,
} from '../proto/plugnmeet_datamessage_pb';

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
    const dataMsg = new DataMessage({
      type: DataMsgType.SYSTEM,
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      body: {
        type: DataMsgBodyType.USER_VISIBILITY_CHANGE,
        from: {
          sid: session.currentUser?.sid ?? '',
          userId: session.currentUser?.userId ?? '',
        },
        msg: hidden ? 'hidden' : 'visible',
      },
    });

    sendWebsocketMessage(dataMsg.toBinary());
  }, [hidden]);
};

export default useWatchVisibilityChange;
