import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChangeVisibilityRes,
  ChangeVisibilityResSchema,
} from 'plugnmeet-protocol-js';
import { create, toBinary } from '@bufbuild/protobuf';
import { debounce } from 'es-toolkit';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveWhiteboard } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { WhiteBoardIconSVG } from '../../../assets/Icons/WhiteBoardIconSVG';
import { participantsSelector } from '../../../store/slices/participantSlice';

const WhiteboardIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isInitialMount = useRef(true);
  const isLocalAction = useRef(false);

  const { showTooltip, allowedWhiteboard, currentUserId, isAdmin, isRecorder } =
    useMemo(() => {
      const session = store.getState().session;
      const currentUser = session.currentUser;
      return {
        showTooltip: session.userDeviceType === 'desktop',
        allowedWhiteboard:
          session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures
            ?.allowedWhiteboard,
        currentUserId: currentUser?.userId,
        isAdmin: currentUser?.metadata?.isAdmin,
        isRecorder: currentUser?.isRecorder,
      };
    }, []);

  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const isVisible = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures
        ?.visible,
  );
  const isPresenter = useAppSelector(
    (state) =>
      !!participantsSelector.selectById(state, currentUserId ?? '')?.metadata
        .isPresenter,
  );

  const canControlWhiteboard = useMemo(() => {
    // only user who is admin and presenter can control whiteboard
    return isAdmin && isPresenter && !isRecorder;
  }, [isAdmin, isPresenter, isRecorder]);

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
      const isVisible =
        currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible;

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
    }, 500),
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
    isLocalAction.current = true;
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  }, [dispatch, isActiveWhiteboard]);

  return (
    allowedWhiteboard && (
      <div
        className={`whiteboard relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveWhiteboard ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
        onClick={toggleWhiteboard}
      >
        <div
          className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
            showTooltip ? 'has-tooltip' : ''
          } ${isActiveWhiteboard ? 'bg-gray-100' : 'bg-white'}`}
        >
          <span className="tooltip">
            {isActiveWhiteboard
              ? t('footer.icons.hide-whiteboard')
              : t('footer.icons.show-whiteboard')}
          </span>
          <WhiteBoardIconSVG />
        </div>
      </div>
    )
  );
};

export default WhiteboardIcon;
