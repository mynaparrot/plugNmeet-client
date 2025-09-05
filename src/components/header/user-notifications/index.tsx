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
// import { ShareScreenIconSVG } from '../../../assets/Icons/ShareScreenIconSVG';
// import { SpeechIconSVG } from '../../../assets/Icons/SpeechIconSVG';
// import { PollsIconSVG } from '../../../assets/Icons/PollsIconSVG';
// import { MicrophoneOff } from '../../../assets/Icons/MicrophoneOff';
// import { HandsIconSVG } from '../../../assets/Icons/HandsIconSVG';
// import { CheckMarkIconSVG } from '../../../assets/Icons/CheckMarkIconSVG';
// import { LinksIconSVG } from '../../../assets/Icons/LinksIconSVG';
// import { UploadIconSVG } from '../../../assets/Icons/UploadIconSVG';
import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';

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
          switch (notif.typeOption) {
            case 'info':
              elm = (
                <div
                  className="notification notif-new-poll flex gap-4 py-2 px-4 border-b border-Gray-200"
                  key={notif.created}
                >
                  <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
                    <NotifyIconSVG classes="w-[15px] h-auto" />
                  </div>
                  <div className="text flex-1 text-Gray-800 text-sm">
                    <p>{notif.message}</p>
                    <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                      <span className="">12:04 AM</span>
                    </div>
                  </div>
                </div>
              );
              break;
            case 'warning':
              elm = (
                <div
                  className="notification notif-new-poll flex gap-4 py-2 px-4 border-b border-Gray-200"
                  key={notif.created}
                >
                  <div className="icon w-9 h-9 rounded-full bg-Green-100 text-Green-700 relative inline-flex items-center justify-center">
                    <NotifyIconSVG classes="w-[15px] h-auto" />
                  </div>
                  <div className="text flex-1 text-Gray-800 text-sm">
                    <p>{notif.message}</p>
                    <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                      <span className="">12:04 AM</span>
                    </div>
                  </div>
                </div>
              );
              break;
            case 'error':
              elm = (
                <div
                  className="notification notif-new-poll flex gap-4 py-2 px-4 border-b border-Gray-200"
                  key={notif.created}
                >
                  <div className="icon w-9 h-9 rounded-full bg-Red-100 text-Red-600 relative inline-flex items-center justify-center">
                    <NotifyIconSVG classes="w-[15px] h-auto" />
                  </div>
                  <div className="text flex-1 text-Gray-800 text-sm">
                    <p>{notif.message}</p>
                    <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                      <span className="">12:04 AM</span>
                    </div>
                  </div>
                </div>
              );
              break;
            default:
          }
          elm = (
            <div
              className="notification notif-new-poll flex gap-4 py-2 px-4 border-b border-Gray-200"
              key={notif.created}
            >
              <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
                <NotifyIconSVG classes="w-[15px] h-auto" />
              </div>
              <div className="text flex-1 text-Gray-800 text-sm">
                <p>{notif.message}</p>
                <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                  <span className="">12:04 AM</span>
                </div>
              </div>
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
          <NotifyIconSVG classes="w-5 h-auto" />
          <span className="unseen-notification-count bg-secondary-color w-4 3xl:w-5 h-4 3xl:h-5 rounded-full text-[10px] 3xl:text-xs text-white absolute -top-2 -right-1 flex justify-center items-center">
            {hasUnreadNotifications}
          </span>
        </div>
      );
    } else {
      return <NotifyIconSVG classes="w-4 h-auto" />;
    }
  };

  return (
    <Popover className="relative flex">
      {({ open, close }) => (
        <>
          <PopoverButton
            className={`w-8 h-8 flex items-center justify-center rounded-[10px] cursor-pointer ${open ? 'bg-Gray-50' : ''}`}
          >
            {displayIcon(open)}
          </PopoverButton>
          <Transition show={open}>
            <div
              className={clsx([
                // Base styles
                'notifications-panel fixed transition ease-in-out w-[300px] 3xl:w-[340px] right-0 h-[calc(100%-110px)] 3xl:h-[calc(100%-144px)] top-[54px] 3xl:top-[68px] bg-Gray-25 border-l border-Gray-200',
                // Shared closed styles
                'data-closed:opacity-0',
                // Entering styles
                'data-enter:duration-300 data-enter:data-closed:translate-x-full',
                // Leaving styles
                'data-leave:duration-300 data-leave:data-closed:translate-x-full',
              ])}
            >
              <PopoverPanel className="flex flex-col">
                <div className="top flex items-center justify-between h-10 px-3 border-b border-Gray-200">
                  <p className="text-sm text-Gray-950 font-medium leading-tight">
                    Notifications
                  </p>
                  <div
                    className="close cursor-pointer"
                    onClick={async () => {
                      close();
                    }}
                  >
                    <PopupCloseSVGIcon classes="text-Gray-600" />
                  </div>
                </div>
                <div className="scrollBar overflow-auto h-[calc(100vh-148px)] 3xl:h-[calc(100vh-184px)] py-4">
                  <div className="inner grid gap-2">
                    {notificationElms}
                    {/* <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="name w-9 h-9 rounded-xl bg-Blue2-700 text-sm font-medium uppercase text-white relative inline-flex items-center justify-center">
                        NB
                        <span className="w-5 h-5 bg-Gray-100 border border-white inline-flex items-center justify-center p-[2px] rounded-full absolute -bottom-1 -right-1 text-Blue2-700">
                          <ShareScreenIconSVG classes="w-[10px] h-auto" />
                        </span>
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>
                          Screen sharing started by{' '}
                          <strong>Noah Benjamin</strong>.
                        </p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>
                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
                        <SpeechIconSVG classes="w-[15px]" />
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>Transcription & Translation enabled.</p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>
                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
                        <svg
                          width="16"
                          height="20"
                          viewBox="0 0 16 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9.66683 1.89063V5.33274C9.66683 5.79945 9.66683 6.03281 9.75766 6.21107C9.83755 6.36787 9.96504 6.49535 10.1218 6.57525C10.3001 6.66608 10.5335 6.66608 11.0002 6.66608H14.4423M5.50016 13.3327L7.16683 14.9993L10.9168 11.2493M9.66683 1.66602H5.3335C3.93336 1.66602 3.2333 1.66602 2.69852 1.9385C2.22811 2.17818 1.84566 2.56063 1.60598 3.03104C1.3335 3.56582 1.3335 4.26588 1.3335 5.66602V14.3327C1.3335 15.7328 1.3335 16.4329 1.60598 16.9677C1.84566 17.4381 2.22811 17.8205 2.69852 18.0602C3.2333 18.3327 3.93336 18.3327 5.3335 18.3327H10.6668C12.067 18.3327 12.767 18.3327 13.3018 18.0602C13.7722 17.8205 14.1547 17.4381 14.3943 16.9677C14.6668 16.4329 14.6668 15.7328 14.6668 14.3327V6.66602L9.66683 1.66602Z"
                            stroke="#009959"
                            strokeWidth="1.67"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>
                          File uploaded successfully:{' '}
                          <strong>“Assignment02.pdf”</strong>
                        </p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>
                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="name w-9 h-9 rounded-xl bg-Blue2-700 text-sm font-medium uppercase text-white relative inline-flex items-center justify-center">
                        NB
                        <span className="w-5 h-5 bg-Gray-100 border border-white inline-flex items-center justify-center p-[2px] rounded-full absolute -bottom-1 -right-1 text-Blue2-700">
                          <UploadIconSVG />
                        </span>
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>
                          <strong>Samuel Brooks</strong> uploaded a file:{' '}
                          <strong>“Assignment.pdf”</strong>
                        </p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>
                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="name w-9 h-9 rounded-xl bg-Blue2-700 text-sm font-medium uppercase text-white relative inline-flex items-center justify-center">
                        NB
                        <span className="w-5 h-5 bg-Gray-100 border border-white inline-flex items-center justify-center p-[2px] rounded-full absolute -bottom-1 -right-1 text-Blue2-700">
                          <LinksIconSVG />
                        </span>
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>
                          <strong>Noah Benjamin</strong> shared a link:{' '}
                          <a
                            className="underline"
                            href="https://plugnmeet.cloud/file/3216"
                          >
                            https://plugnmeet.cloud/file/3216
                          </a>
                        </p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>
                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="icon w-9 h-9 rounded-full bg-Red-100 relative inline-flex items-center justify-center">
                        <PollsIconSVG classes="w-[15px] text-Red-600" />
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>Poll deleted.</p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>

                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="name w-9 h-9 rounded-xl bg-Blue2-700 text-sm font-medium uppercase text-white relative inline-flex items-center justify-center">
                        NB
                        <span className="w-5 h-5 bg-Red-100 border border-white inline-flex items-center justify-center p-[2px] rounded-full absolute -bottom-1 -right-1 text-Blue2-700">
                          <MicrophoneOff classes="w-[10px] h-auto" />
                        </span>
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>Moderator muted your microphone.</p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>
                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
                        <HandsIconSVG classes="w-[15px]" />
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>You raised your hand.</p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div>
                    <div className="notification flex gap-4 py-2 px-4 border-b border-Gray-200">
                      <div className="name w-9 h-9 rounded-xl bg-Blue2-700 text-sm font-medium uppercase text-white relative inline-flex items-center justify-center">
                        NB
                        <span className="w-5 h-5 bg-Green-100 border border-white inline-flex items-center justify-center p-[2px] rounded-full absolute -bottom-1 -right-1 text-Blue2-700">
                          <CheckMarkIconSVG />
                        </span>
                      </div>
                      <div className="text flex-1 text-Gray-800 text-sm">
                        <p>Moderator approved your request to join.</p>
                        <span className="text-Gray-800 text-xs">12:04 AM</span>
                      </div>
                    </div> */}
                  </div>
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
