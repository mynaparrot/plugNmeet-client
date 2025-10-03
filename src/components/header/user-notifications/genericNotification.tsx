import React from 'react';
import clsx from 'clsx';

import { UserNotification } from '../../../store/slices/interfaces/roomSettings';
import { NotifyIconSVG } from '../../../assets/Icons/NotifyIconSVG';

interface IGenericNotificationProps {
  notification: UserNotification;
}

const GenericNotification = ({ notification }: IGenericNotificationProps) => {
  const formatDate = (timeStamp?: number) => {
    const date = new Date(timeStamp ?? 0);
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const iconClasses = clsx(
    'icon w-9 h-9 rounded-full relative inline-flex items-center justify-center',
    {
      'bg-Gray-100 text-Blue2-800': notification.typeOption === 'info',
      'bg-Green-100 text-Green-700': notification.typeOption === 'warning',
      'bg-Red-100 text-Red-600': notification.typeOption === 'error',
    },
  );

  return (
    <div
      className="notification notif-new-poll w-full flex gap-4 py-2 px-4 border-b border-Gray-200"
      key={notification.created}
    >
      <div className={iconClasses}>
        <NotifyIconSVG classes="w-[15px] h-auto" />
      </div>
      <div className="text flex-1 text-Gray-800 text-sm">
        <p>{notification.message}</p>
        <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
          <span className="">{formatDate(notification.created)}</span>
        </div>
      </div>
    </div>
  );
};

export default GenericNotification;
