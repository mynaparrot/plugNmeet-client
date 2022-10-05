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

const isActiveSharedNotePadSelector = createSelector(
  (state: RootState) => state.bottomIconsActivity.isActiveSharedNotePad,
  (isActiveSharedNotePad) => isActiveSharedNotePad,
);
const sharedNotepadStatusSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.shared_note_pad_features
      .is_active,
  (is_active) => is_active,
);
const isSharedNotepadVisibleSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.shared_note_pad_features
      .visible,
  (visible) => visible,
);

const SharedNotePadIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const isActiveSharedNotePad = useAppSelector(isActiveSharedNotePadSelector);
  const sharedNotepadStatus = useAppSelector(sharedNotepadStatusSelector);
  const isVisible = useAppSelector(isSharedNotepadVisibleSelector);
  const [initiated, setInitiated] = useState<boolean>(false);
  const isAdmin = store.getState().session.currentUser?.metadata?.is_admin;
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  useEffect(() => {
    // if not active then we can disable it.
    if (!sharedNotepadStatus) {
      dispatch(updateIsActiveSharedNotePad(false));
    } else {
      dispatch(updateIsActiveSharedNotePad(true));
    }
  }, [sharedNotepadStatus, dispatch]);

  useEffect(() => {
    if (isActiveSharedNotePad) {
      setIconCSS('secondaryColor');
      if (store.getState().bottomIconsActivity.isActiveWhiteboard) {
        dispatch(updateIsActiveWhiteboard(false));
      }
      if (!isRecorder) {
        dispatch(updateIsActiveChatPanel(false));
      }
    } else {
      setIconCSS('primaryColor dark:text-darkText');
    }
    //eslint-disable-next-line
  }, [isActiveSharedNotePad, dispatch]);

  useEffect(() => {
    if (!sharedNotepadStatus) {
      return;
    }

    if (isVisible) {
      dispatch(updateIsActiveSharedNotePad(true));
    } else {
      dispatch(updateIsActiveSharedNotePad(false));
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
      currentRoom.metadata?.room_features.shared_note_pad_features.visible
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
      isActiveSharedNotePad &&
      !currentRoom.metadata?.room_features.shared_note_pad_features.visible
    ) {
      const body = new ChangeVisibilityRes({
        roomId: currentRoom.room_id,
        visibleWhiteBoard: false,
        visibleNotepad: true,
      });
      // wait little bit before change visibility
      setTimeout(() => {
        sendRequest(body);
      }, 500);
    } else if (
      !isActiveSharedNotePad &&
      currentRoom.metadata?.room_features.shared_note_pad_features.visible
    ) {
      const body = new ChangeVisibilityRes({
        roomId: currentRoom.room_id,
        visibleNotepad: false,
      });
      sendRequest(body);
    }
    //eslint-disable-next-line
  }, [isActiveSharedNotePad]);

  const text = () => {
    if (isActiveSharedNotePad) {
      return t('footer.icons.hide-shared-notepad');
    } else {
      return t('footer.icons.show-shared-notepad');
    }
  };

  const toggleSharedNotePad = async () => {
    const isActiveScreenShare =
      store.getState().bottomIconsActivity.isActiveScreenshare;
    if (isActiveScreenShare) {
      return;
    }
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  };

  const render = () => {
    return (
      <div
        className={`shared-notepad h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] relative rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] mr-3 lg:mr-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleSharedNotePad()}
      >
        <span className="tooltip rounded shadow-lg p-1 bg-gray-100 dark:bg-darkSecondary2 text-red-500 dark:text-darkText -mt-16 text-[10px] w-max">
          {text()}
        </span>
        <>
          <i className={`pnm-notepad ${iconCSS} text-[14px] lg:text-[16px]`} />
        </>
      </div>
    );
  };

  return <>{sharedNotepadStatus ? render() : null}</>;
};

export default SharedNotePadIcon;
