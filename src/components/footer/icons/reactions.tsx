import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  DataMsgBodyType,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';
import clsx from 'clsx';

import { useAppDispatch, useAppSelector } from '../../../store';
import { getNatsConn } from '../../../helpers/nats';
import {
  addReaction,
  REACTION_EMOJIS,
} from '../../../store/slices/reactionsSlice';
import { ReactionsIconSVG } from '../../../assets/Icons/ReactionsIconSVG';
import { HandsIconSVG } from '../../../assets/Icons/HandsIconSVG';

const THROTTLE_MS = 500;

const ReactionsIcon = () => {
  const { t } = useTranslation();
  const conn = getNatsConn();
  const dispatch = useAppDispatch();
  const lastSentAt = useRef<number>(0);

  const userDeviceType = useAppSelector(
    (state) => state.session.userDeviceType,
  );
  const showTooltip = userDeviceType === 'desktop';

  const canReact = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.allowReactions ===
        true &&
      !state.session.currentUser?.metadata?.lockSettings?.lockReactions,
  );
  const canRaiseHand = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.allowRaiseHand !==
      false,
  );
  const isActiveRaisehand = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveRaisehand,
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      const now = Date.now();
      if (now - lastSentAt.current < THROTTLE_MS) {
        return;
      }
      lastSentAt.current = now;

      conn.sendDataMessage(DataMsgBodyType.REACTION, emoji);

      dispatch(
        addReaction({
          id: `${conn.userId}-${now}`,
          emoji,
          fromUserId: conn.userId,
          createdAt: now,
        }),
      );

      conn.sendAnalyticsData(
        AnalyticsEvents.ANALYTICS_EVENT_USER_REACTION,
        AnalyticsEventType.USER,
        undefined,
        emoji,
      );
    },
    [conn, dispatch],
  );

  const toggleRaiseHand = useCallback(() => {
    const data = create(NatsMsgClientToServerSchema, {});
    if (!isActiveRaisehand) {
      data.event = NatsMsgClientToServerEvents.REQ_RAISE_HAND;
      data.msg = t('footer.notice.has-raised-hand', {
        user: conn.userName,
      }).toString();
    } else {
      data.event = NatsMsgClientToServerEvents.REQ_LOWER_HAND;
    }
    conn.sendMessageToSystemWorker(data);
  }, [isActiveRaisehand, conn, t]);

  if (!canReact && !canRaiseHand) {
    return null;
  }

  // reactions unavailable (locked/disabled) → fall back to the classic
  // single-click raise-hand button, no popover
  if (!canReact) {
    return (
      <div
        className={clsx(
          'raise-hand relative footer-icon cursor-pointer w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
          isActiveRaisehand
            ? 'border-[rgba(124,206,247,0.25)] dark:border-Gray-800'
            : 'border-transparent',
        )}
        onClick={toggleRaiseHand}
      >
        <div
          className={clsx(
            'footer-icon-bg h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white',
            {
              'has-tooltip': showTooltip,
              'bg-gray-100 dark:bg-Gray-700': isActiveRaisehand,
              'bg-white dark:bg-Gray-800': !isActiveRaisehand,
            },
          )}
        >
          <span className="tooltip">
            {isActiveRaisehand
              ? t('footer.icons.lower-hand')
              : t('footer.icons.raise-hand')}
          </span>
          <HandsIconSVG classes={'h-4 md:h-5 w-auto'} />
        </div>
      </div>
    );
  }

  const innerDivClasses = clsx(
    'footer-icon-bg h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100 dark:bg-Gray-700 border-Gray-300 dark:border-Gray-700':
        isActiveRaisehand,
      'bg-white dark:bg-Gray-800 border-Gray-300 dark:border-Gray-700':
        !isActiveRaisehand,
    },
  );

  return (
    <Popover className="reactions relative footer-icon">
      <PopoverButton
        className={clsx(
          'w-10 md:w-11 3xl:w-[52px] h-10 md:h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 cursor-pointer outline-none',
          isActiveRaisehand
            ? 'border-[rgba(124,206,247,0.25)] dark:border-Gray-800'
            : 'border-transparent',
        )}
        aria-label={t('footer.icons.reactions').toString()}
      >
        <div className={innerDivClasses}>
          <span className="tooltip">{t('footer.icons.reactions')}</span>
          <ReactionsIconSVG classes={'h-4 md:h-5 w-auto'} />
        </div>
      </PopoverButton>

      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95 translate-y-2"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100 translate-y-0"
        leaveTo="transform opacity-0 scale-95 translate-y-2"
      >
        <PopoverPanel className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50">
          <div className="flex flex-col gap-2 p-2 rounded-2xl bg-white dark:bg-dark-primary border border-Gray-100 dark:border-Gray-700 shadow-lg">
            {canReact ? (
              <div className="flex items-center gap-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    className="w-9 h-9 3xl:w-10 3xl:h-10 flex items-center justify-center text-xl 3xl:text-2xl rounded-full hover:bg-Gray-50 dark:hover:bg-dark-secondary2 transition-transform duration-150 hover:scale-125 cursor-pointer"
                    onClick={() => sendReaction(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}

            {canRaiseHand ? (
              <button
                type="button"
                onClick={toggleRaiseHand}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 h-9 3xl:h-10 px-3 rounded-xl border text-sm font-medium whitespace-nowrap cursor-pointer transition-colors duration-150',
                  isActiveRaisehand
                    ? 'bg-Blue2-50 dark:bg-dark-secondary2 border-Blue2-500 text-Blue2-700 dark:text-dark-text'
                    : 'bg-white dark:bg-dark-primary border-Gray-200 dark:border-dark-secondary2 text-Gray-950 dark:text-dark-text hover:bg-Gray-50 dark:hover:bg-dark-secondary2',
                )}
              >
                <span aria-hidden>✋</span>
                {isActiveRaisehand
                  ? t('footer.icons.lower-hand')
                  : t('footer.icons.raise-hand')}
              </button>
            ) : null}
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  );
};

export default ReactionsIcon;
