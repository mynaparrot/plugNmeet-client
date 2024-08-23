import { useEffect, useState } from 'react';

import { DataMsgBodyType } from '../proto/plugnmeet_datamessage_pb';
import { getNatsConn } from '../nats';

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
    const conn = getNatsConn();
    if (typeof conn === 'undefined') {
      return;
    }

    conn.sendDataMessage(
      DataMsgBodyType.USER_VISIBILITY_CHANGE,
      hidden ? 'hidden' : 'visible',
    );
    //eslint-disable-next-line
  }, [hidden]);
};

export default useWatchVisibilityChange;
