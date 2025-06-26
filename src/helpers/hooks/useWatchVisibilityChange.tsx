import { useEffect, useState } from 'react';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  DataMsgBodyType,
} from 'plugnmeet-protocol-js';

import { getNatsConn } from '../nats';
import { updateIsPNMWindowTabVisible } from '../../store/slices/roomSettingsSlice';
import { useAppDispatch } from '../../store';

const useWatchVisibilityChange = () => {
  const [hidden, setHidden] = useState<boolean>(false);
  const conn = getNatsConn();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onBlur = () => {
      setHidden(true);
    };
    const onFocus = () => {
      setHidden(false);
    };

    window.addEventListener('blur-sm', onBlur, false);
    window.addEventListener('focus', onFocus, false);

    return () => {
      window.removeEventListener('blur-sm', onBlur);
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
    if (typeof conn === 'undefined') {
      return;
    }
    const data = hidden ? 'hidden' : 'visible';
    conn.sendDataMessage(DataMsgBodyType.USER_VISIBILITY_CHANGE, data);
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_INTERFACE_VISIBILITY,
      AnalyticsEventType.USER,
      data,
    );
    dispatch(updateIsPNMWindowTabVisible(!hidden));
    //eslint-disable-next-line
  }, [hidden]);
};

export default useWatchVisibilityChange;
