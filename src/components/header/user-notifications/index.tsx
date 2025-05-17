import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

import { store, useAppSelector } from '../../../store';
import { UserNotification } from '../../../store/slices/interfaces/roomSettings';
import NewPoll from './newPoll';
import NewBreakoutRoom from './newBreakoutRoom';

const UserNotifications = () => {
  const toastId = useRef<number | string>('toastId');
  const userNotifications = useAppSelector(
    (state) => state.roomSettings.userNotifications,
  );
  const [notificationElms, setNotificationElms] = useState<ReactElement[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] =
    useState<number>(0);

  const displayToast = (
    message: string | ReactElement,
    notification: UserNotification,
  ) => {
    if (notification.disableToastNotification) {
      return;
    }

    toast(message, {
      type: notification.typeOption,
      autoClose: notification.autoClose,
      toastId: notification.newInstance ? undefined : toastId.current,
    });

    const isPNMWindowTabVisible =
      store.getState().roomSettings.isPNMWindowTabVisible;
    if (!isPNMWindowTabVisible) {
      setHasUnreadNotifications((prevState) => prevState + 1);

      if ('Notification' in window && Notification.permission === 'granted') {
        // we'll see if website has any favicon icon, then we'll use it
        const favicon = document.querySelector("link[rel*='icon']");
        let icon: string | undefined = undefined;
        if (favicon) {
          icon = favicon.getAttribute('href') ?? undefined;
        }
        new Notification(notification.message, { icon });
      }
    }
  };

  useEffect(() => {
    if (!userNotifications.length) {
      return;
    }

    const elms: ReactElement[] = [];
    for (let i = userNotifications.length - 1; i >= 0; i--) {
      const notif = userNotifications[i];
      let elm: ReactElement;
      switch (notif.notificationCat) {
        case 'new-poll-created':
          elm = <NewPoll key={notif.created} />;
          break;
        case 'breakout-room-invitation':
          elm = (
            <NewBreakoutRoom
              key={notif.created}
              receivedInvitationFor={notif.data}
            />
          );
          break;
        default:
          elm = (
            <div className="" key={notif.created}>
              {notif.message}
            </div>
          );
      }
      // get the last element to display as notification
      if (i === userNotifications.length - 1) {
        displayToast(elm, notif);
      }
      elms.push(elm);
    }

    setNotificationElms(elms);
  }, [userNotifications]);

  const displayIcon = (open: boolean) => {
    if (open) {
      setTimeout(() => setHasUnreadNotifications(0), 300);
    }
    if (hasUnreadNotifications > 0) {
      return <>Notif({hasUnreadNotifications})</>;
    } else {
      return <>Notif</>;
    }
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton>{displayIcon(open)}</PopoverButton>
          <PopoverPanel anchor="bottom" className="flex flex-col">
            {notificationElms}
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
};

export default UserNotifications;
