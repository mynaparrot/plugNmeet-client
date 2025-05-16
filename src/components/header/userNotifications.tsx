import React, {
  useState,
  ReactElement,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { toast } from 'react-toastify';

import { useAppDispatch, useAppSelector } from '../../store';
import { UserNotification } from '../../store/slices/interfaces/roomSettings';
import { useTranslation } from 'react-i18next';
import { updateIsActivePollsPanel } from '../../store/slices/bottomIconsActivitySlice';

const UserNotifications = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const toastId = useRef<number | string>('toastId');
  const userNotifications = useAppSelector(
    (state) => state.roomSettings.userNotifications,
  );
  const [notificationElms, setNotificationElms] = useState<ReactElement[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] =
    useState<number>(0);

  const displayToast = (notification: UserNotification) => {
    toast(notification.message, {
      type: notification.typeOption,
      autoClose: notification.autoClose,
      toastId: notification.newInstance ? undefined : toastId.current,
    });
    setHasUnreadNotifications((prevState) => prevState + 1);
  };

  useEffect(() => {
    if (!userNotifications.length) {
      return;
    }
    // get the first element to display notification
    const toDisplay = userNotifications[userNotifications.length - 1];
    displayToast(toDisplay);

    const elms: ReactElement[] = [];
    for (let i = userNotifications.length - 1; i >= 0; i--) {
      const notif = userNotifications[i];
      switch (notif.notificationCat) {
        case 'new-poll-created':
          elms.push(
            <div key={notif.created}>
              <span className="text-black dark:text-darkText">
                {t('polls.new-poll')}
              </span>
              <div className="button-section flex items-center justify-start">
                <button
                  className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
                  onClick={() => dispatch(updateIsActivePollsPanel(true))}
                >
                  {t('open')}
                </button>
              </div>
            </div>,
          );
          break;
        case 'breakout-room-invitation':
          elms.push(
            <div key={notif.created}>
              <span className="text-black dark:text-darkText">
                {t('breakout-room.invitation-msg')}
              </span>
              <div className="button-section flex items-center justify-start">
                <button
                  className="text-center py-1 px-3 mt-1 text-xs transition ease-in bg-primaryColor hover:bg-secondaryColor text-white font-semibold rounded-lg"
                  onClick={() => console.log('will think how to do')}
                >
                  {t('open')}
                </button>
              </div>
            </div>,
          );
          break;
        default:
          elms.push(
            <div className="" key={notif.created}>
              Normal list without any button {notif.created}
            </div>,
          );
      }
    }

    setNotificationElms(elms);
    //eslint-disable-next-line
  }, [userNotifications]);

  const displayIcon = useCallback(
    (open: boolean) => {
      if (open) {
        setHasUnreadNotifications(0);
      }
      if (hasUnreadNotifications > 0) {
        return <>Notif({hasUnreadNotifications})</>;
      } else {
        return <>Notif</>;
      }
    },
    [hasUnreadNotifications],
  );

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
