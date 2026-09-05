import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { setActiveSidePanel } from '../../../store/slices/bottomIconsActivitySlice';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import { useGetMyBreakoutRoomsQuery } from '../../../store/services/breakoutRoomApi';
import { BreakoutRoomIconSVG } from '../../../assets/Icons/BreakoutRoomIconSVG';

// page-load time; invitations delivered in this session suppress the
// mount-time reminder, persisted notifications from older sessions do not
const SESSION_START = Date.now();

const BreakoutRoomsIcon = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showTooltip = useMemo(
    () => store.getState().session.userDeviceType === 'desktop',
    [],
  );

  const isActivePanel = useAppSelector(
    (state) => state.bottomIconsActivity.activeSidePanel === 'BREAKOUT_ROOMS',
  );

  const isVisible = useAppSelector((state) => {
    const meta = state.session.currentRoom?.metadata;
    return (
      !!meta?.roomFeatures?.breakoutRoomFeatures?.isActive &&
      !meta?.isBreakoutRoom
    );
  });

  const isAdmin = useAppSelector(
    (state) => !!state.session.currentUser?.metadata?.isAdmin,
  );
  const isBreakoutRoom = useAppSelector(
    (state) => !!state.session.currentRoom?.metadata?.isBreakoutRoom,
  );

  // invites only matter to non-admins sitting in the main interface
  const { data: myRoomRes, isSuccess } = useGetMyBreakoutRoomsQuery(undefined, {
    skip: isAdmin || isBreakoutRoom,
  });
  const invitedRef = useRef(false);

  useEffect(() => {
    if (!isVisible && isActivePanel) {
      dispatch(setActiveSidePanel('BREAKOUT_ROOMS'));
    }
    //eslint-disable-next-line
  }, [isVisible]);

  useEffect(() => {
    if (invitedRef.current || !isSuccess || !myRoomRes?.status) return;
    const room = myRoomRes.room;
    if (!room) return;
    // an invitation already delivered during THIS page-load session
    // (create-time NATS invite while on the landing page or in the main
    // interface, or an admin re-invite) must not produce a second toast
    const alreadyInvited = (
      store.getState().roomSettings.userNotifications ?? []
    ).some(
      (n) =>
        n.notificationCat === 'breakout-room-invitation' &&
        (n.created ?? 0) >= SESSION_START,
    );
    if (alreadyInvited) return;
    invitedRef.current = true;
    dispatch(
      addUserNotification({
        message: t('breakout-room.invitation-msg'),
        typeOption: 'info',
        notificationCat: 'breakout-room-invitation',
        autoClose: false,
      }),
    );
  }, [isSuccess, myRoomRes, dispatch, t]);

  const togglePanel = useCallback(() => {
    dispatch(setActiveSidePanel('BREAKOUT_ROOMS'));
  }, [dispatch]);

  const wrapperClasses = clsx(
    'breakoutRoomsPanelIcon hidden md:block relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4',
    {
      'focus-ring': true,
      'border-[rgba(124,206,247,0.25)] dark:border-Gray-800': isActivePanel,
      'border-transparent': !isActivePanel,
    },
  );

  const innerDivClasses = clsx(
    'footer-icon-bg h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow-sm transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white',
    {
      'has-tooltip': showTooltip,
      'bg-gray-100 dark:bg-Gray-700': isActivePanel,
      'bg-white dark:bg-Gray-800': !isActivePanel,
    },
  );

  if (!isVisible) {
    return null;
  }

  const tooltipText = isActivePanel
    ? t('footer.icons.hide-breakout-rooms-panel')
    : t('footer.icons.show-breakout-rooms-panel');

  return (
    <button
      type="button"
      className={wrapperClasses}
      onClick={togglePanel}
      aria-label={tooltipText.toString()}
    >
      <div className={innerDivClasses}>
        <span className="tooltip">{tooltipText}</span>
        <BreakoutRoomIconSVG classes="" />
      </div>
    </button>
  );
};

export default BreakoutRoomsIcon;
