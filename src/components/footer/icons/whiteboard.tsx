import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';

import {
  RootState,
  store,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import {
  updateIsActiveChatPanel,
  updateIsActiveSharedNotePad,
  updateIsActiveWhiteboard,
} from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { ChangeVisibilityRes } from '../../../helpers/proto/plugnmeet_common_api_pb';

const isActiveWhiteboardSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveWhiteboard,
  (isActiveWhiteboard) => isActiveWhiteboard,
);
const isWhiteboardVisibleSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.whiteboard_features
      .visible,
  (visible) => visible,
);

const WhiteboardIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const [initiated, setInitiated] = useState<boolean>(false);
  const isActiveWhiteboard = useAppSelector(isActiveWhiteboardSelector);
  const isVisible = useAppSelector(isWhiteboardVisibleSelector);

  const allowedWhiteboard =
    store.getState().session.currentRoom.metadata?.room_features
      .whiteboard_features.allowed_whiteboard;
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  useEffect(() => {
    if (isActiveWhiteboard) {
      setIconCSS('secondaryColor');
      if (store.getState().bottomIconsActivity.isActiveSharedNotePad) {
        dispatch(updateIsActiveSharedNotePad(false));
      }
      if (!isRecorder) {
        dispatch(updateIsActiveChatPanel(false));
      }
    } else {
      setIconCSS('primaryColor dark:text-darkText');
    }
    //eslint-disable-next-line
  }, [dispatch, isActiveWhiteboard]);

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

  useEffect(() => {
    if (!isAdmin || isRecorder) {
      return;
    }
    const currentRoom = store.getState().session.currentRoom;

    if (
      !initiated &&
      currentRoom.metadata?.room_features.whiteboard_features.visible
    ) {
      setInitiated(true);
      return;
    } else if (!initiated) {
      setInitiated(true);
    }

    const sendRequest = async (body: ChangeVisibilityRes) => {
      await sendAPIRequest(
        'changeVisibility',
        body.toBinary(),
        false,
        'application/protobuf',
      );
    };

    if (
      isActiveWhiteboard &&
      !currentRoom.metadata?.room_features.whiteboard_features.visible
    ) {
      const body = new ChangeVisibilityRes({
        roomId: currentRoom.room_id,
        visibleWhiteBoard: true,
        visibleNotepad: false,
      });
      // wait little bit before change visibility
      setTimeout(() => {
        sendRequest(body);
      }, 500);
    } else if (
      !isActiveWhiteboard &&
      currentRoom.metadata?.room_features.whiteboard_features.visible
    ) {
      const body = new ChangeVisibilityRes({
        roomId: currentRoom.room_id,
        visibleWhiteBoard: false,
      });
      sendRequest(body);
    }
    //eslint-disable-next-line
  }, [isActiveWhiteboard]);

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

  const render = () => {
    return (
      <div
        className={`whiteboard h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] relative rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleWhiteboard()}
      >
        <span className="tooltip rounded shadow-lg p-1 bg-gray-100 dark:bg-darkSecondary2 text-red-500 dark:text-darkText -mt-16 text-[10px] w-max">
          {text()}
        </span>
        <>
          <i
            className={`pnm-whiteboard ${iconCSS} text-[14px] lg:text-[16px]`}
          />
        </>
      </div>
    );
  };

  return <>{allowedWhiteboard ? render() : null}</>;
};

export default WhiteboardIcon;
