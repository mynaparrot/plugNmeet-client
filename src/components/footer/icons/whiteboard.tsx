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
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const isInitialMount = useRef(true);

  const session = store.getState().session;
  const allowedWhiteboard =
    session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures
      ?.allowedWhiteboard;
  const currentUser = session.currentUser;
  const isAdmin = currentUser?.metadata?.isAdmin;
  const isRecorder = currentUser?.isRecorder;

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
      !!participantsSelector.selectById(state, currentUser?.userId ?? '')
        ?.metadata.isPresenter,
  );

  const canControlWhiteboard = useMemo(() => {
    // only user who is admin and presenter can control whiteboard
    return isAdmin && isPresenter && !isRecorder;
  }, [isAdmin, isPresenter, isRecorder]);

  useEffect(() => {
    if (!allowedWhiteboard) {
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

  const text = () => {
    if (isActiveWhiteboard) {
      return t('footer.icons.hide-whiteboard');
    } else {
      return t('footer.icons.show-whiteboard');
    }
  };

  const toggleWhiteboard = async () => {
    const isActiveScreenShare =
      store.getState().bottomIconsActivity.isActiveScreenshare;
    if (isActiveScreenShare) {
      return;
    }
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  };

  return (
    allowedWhiteboard && (
      <div
        className={`whiteboard relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${isActiveWhiteboard ? 'border-[rgba(124,206,247,0.25)]' : 'border-transparent'}`}
        onClick={() => toggleWhiteboard()}
      >
        <div
          className={`h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
            showTooltip ? 'has-tooltip' : ''
          } ${isActiveWhiteboard ? 'bg-gray-100' : 'bg-white'}`}
        >
          <span className="tooltip">{text()}</span>
          <WhiteBoardIconSVG />
        </div>
      </div>
    )
  );
};

export default WhiteboardIcon;
