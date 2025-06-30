import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import { store, useAppSelector } from '../../../store';
import { UserNotification } from '../../../store/slices/interfaces/roomSettings';
import NewPoll from './newPoll';
import NewBreakoutRoom from './newBreakoutRoom';
import { NotifyIconSVG } from '../../../assets/Icons/NotifyIconSVG';
import clsx from 'clsx';

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
        // oxlint-disable-next-line no-new
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
      return (
        <div className="relative">
          <NotifyIconSVG />
          <span className="unseen-notification-count bg-secondary-color w-4 3xl:w-5 h-4 3xl:h-5 rounded-full text-[10px] 3xl:text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
            {hasUnreadNotifications}
          </span>
        </div>
      );
    } else {
      return <NotifyIconSVG />;
    }
  };

  return (
    <Popover className="relative flex">
      {({ open }) => (
        <>
          <PopoverButton className="p-2">{displayIcon(open)}</PopoverButton>
          <Transition show={open}>
            <div
              className={clsx([
                // Base styles
                'notifications-panel fixed transition ease-in-out w-[300px] 3xl:w-[340px] right-0 h-[calc(100%-144px)] top-[68px] bg-Gray-25 border-l border-Gray-200',
                // Shared closed styles
                'data-closed:opacity-0',
                // Entering styles
                'data-enter:duration-300 data-enter:data-closed:translate-x-full',
                // Leaving styles
                'data-leave:duration-300 data-leave:data-closed:translate-x-full',
              ])}
            >
              <PopoverPanel className="flex flex-col">
                <div className="top flex items-center h-10 px-3 border-b border-Gray-200">
                  <p className="text-sm text-Gray-950 font-medium leading-tight">
                    Notifications
                  </p>
                </div>
                <div className="scrollBar overflow-auto h-[calc(100vh-184px)] px-3 py-4">
                  <div className="inner grid gap-2">{notificationElms}</div>
                </div>
              </PopoverPanel>
            </div>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default UserNotifications;
