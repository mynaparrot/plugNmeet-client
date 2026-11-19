import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChangeVisibilityRes, ChangeVisibilityResSchema } from 'plugnmeet-protocol-js';
import { create, toBinary } from '@bufbuild/protobuf';
import { debounce } from 'es-toolkit';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveWhiteboard } from '../../../store/slices/bottomIconsActivitySlice';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { WhiteBoardIconSVG } from '../../../assets/Icons/WhiteBoardIconSVG';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { isWorkspaceControlledByAIAgent } from '../../../helpers/aiAgentSession';

const WhiteboardIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isInitialMount = useRef(true);
  const isLocalAction = useRef(false);

  const { showTooltip, allowedWhiteboard, currentUserId, isAdmin, isRecorder } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      allowedWhiteboard: session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.isAllow,
      currentUserId: currentUser?.userId,
      isAdmin: currentUser?.metadata?.isAdmin,
      isRecorder: currentUser?.isRecorder,
    };
  }, []);

  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const isVisible = useAppSelector(
    (state) => state.session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible,
  );
  const isPresenter = useAppSelector(
    (state) => participantsSelector.selectById(state, currentUserId ?? '')?.metadata.isPresenter,
  );

  const isAiWorkspaceControlled = useAppSelector(isWorkspaceControlledByAIAgent);
  const canControlWhiteboard = useMemo(() => {
    // only user who is admin and presenter can control whiteboard
    return !isAiWorkspaceControlled && isAdmin && isPresenter && !isRecorder;
  }, [isAdmin, isPresenter, isRecorder, isAiWorkspaceControlled]);
  // The AI agent automates the board; a board the presenter opened stays open.
  const isPresenterBoardInProgress = !canControlWhiteboard && !!isVisible && !!isActiveWhiteboard;
  const isLockedControl = isAiWorkspaceControlled || isPresenterBoardInProgress;

  useEffect(() => {
    if (!allowedWhiteboard) {
      return;
    }

    // If the change was initiated locally, we don't need to process the echo.
    if (isLocalAction.current) {
      isLocalAction.current = false;
      return;
    }

    if (isVisible) {
      dispatch(updateIsActiveWhiteboard(true));
    } else if (!isVisible) {
      dispatch(updateIsActiveWhiteboard(false));
    }
    //eslint-disable-next-line
  }, [isVisible]);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSendRequest = useCallback(
    debounce(async (isActive: boolean) => {
      const currentRoom = store.getState().session.currentRoom;
      const isVisible = currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible;

      if (isActive === isVisible) {
        return;
      }

      const sendRequest = async (body: ChangeVisibilityRes) => {
        await sendAPIRequest(
          'changeVisibility',
          toBinary(ChangeVisibilityResSchema, body),
          false,
          'application/protobuf',
        );
      };

      const body = create(ChangeVisibilityResSchema, {
        roomId: currentRoom.roomId,
        visibleWhiteBoard: isActive,
      });
      await sendRequest(body);
      // After sending, we can listen for remote changes again.
      isLocalAction.current = false;
    }, 200),
    [],
  );

  useEffect(() => {
    if (!canControlWhiteboard) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    debouncedSendRequest(isActiveWhiteboard);
  }, [canControlWhiteboard, isActiveWhiteboard, debouncedSendRequest]);

  const toggleWhiteboard = useCallback(() => {
    // prevent toggling whiteboard during screen sharing
    if (store.getState().bottomIconsActivity.isActiveScreenshare) {
      return;
    }
    if (isAiWorkspaceControlled) {
      dispatch(
        addUserNotification({
          message: t('ai-agent.notifications.workspace-controlled-by-ai'),
          typeOption: 'warning',
        }),
      );
      return;
    }
    if (isPresenterBoardInProgress) {
      dispatch(
        addUserNotification({
          message: t('footer.notice.whiteboard-in-progress'),
          typeOption: 'warning',
        }),
      );
      return;
    }
    isLocalAction.current = true;
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  }, [dispatch, isActiveWhiteboard, isAiWorkspaceControlled, isPresenterBoardInProgress, t]);

  const tooltipText = isAiWorkspaceControlled
    ? t('ai-agent.notifications.workspace-controlled-by-ai')
    : isPresenterBoardInProgress
      ? t('footer.notice.whiteboard-in-progress')
      : isActiveWhiteboard
        ? t('footer.icons.hide-whiteboard')
        : t('footer.icons.show-whiteboard');

  return (
    allowedWhiteboard && (
      <button
        type="button"
        className={`whiteboard hidden md:block relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 focus-ring ${isActiveWhiteboard ? 'border-focus-ring dark:border-Gray-800' : 'border-transparent'}`}
        onClick={toggleWhiteboard}
        aria-label={tooltipText.toString()}
      >
        <div
          className={`footer-icon-bg h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300  dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700  text-Gray-950 dark:text-white ${
            showTooltip ? 'has-tooltip' : ''
          } ${isActiveWhiteboard ? 'bg-gray-100 dark:bg-Gray-700' : 'bg-white dark:bg-Gray-800'}`}
        >
          <span className="tooltip">{tooltipText}</span>
          {isLockedControl && (
            <i
              aria-hidden="true"
              className="pnm-lock primaryColor absolute top-1 end-1 text-[10px]"
            />
          )}
          <WhiteBoardIconSVG />
        </div>
      </button>
    )
  );
};

export default WhiteboardIcon;
