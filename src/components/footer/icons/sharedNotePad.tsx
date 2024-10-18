import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChangeVisibilityRes,
  ChangeVisibilityResSchema,
} from 'plugnmeet-protocol-js';
import { create, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  updateIsActiveChatPanel,
  updateIsActiveSharedNotePad,
} from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const SharedNotePadIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const sharedNotepadStatus = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );
  const isVisible = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.visible,
  );
  const [initiated, setInitiated] = useState<boolean>(false);
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  useEffect(() => {
    // if not active, then we can disable it.
    if (!sharedNotepadStatus) {
      dispatch(updateIsActiveSharedNotePad(false));
    } else {
      dispatch(updateIsActiveSharedNotePad(true));
    }
  }, [sharedNotepadStatus, dispatch]);

  useEffect(() => {
    if (isActiveSharedNotePad) {
      setIconCSS('secondaryColor');
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
      currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.visible
    ) {
      setInitiated(true);
      return;
    } else if (!initiated) {
      setInitiated(true);
    }

    const sendRequest = async (body: ChangeVisibilityRes) => {
      await sendAPIRequest(
        'changeVisibility',
        toBinary(ChangeVisibilityResSchema, body),
        false,
        'application/protobuf',
      );
    };

    if (
      isActiveSharedNotePad &&
      !currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.visible
    ) {
      const body = create(ChangeVisibilityResSchema, {
        roomId: currentRoom.roomId,
        visibleNotepad: true,
      });
      // wait a little bit before change visibility
      setTimeout(() => {
        sendRequest(body).then();
      }, 500);
    } else if (
      !isActiveSharedNotePad &&
      currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.visible
    ) {
      const body = create(ChangeVisibilityResSchema, {
        roomId: currentRoom.roomId,
        visibleNotepad: false,
      });
      sendRequest(body).then();
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
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  };

  const render = () => {
    return (
      <div
        className={`shared-notepad h-[35px] lg:h-[40px] w-[35px] lg:w-[40px] relative rounded-full bg-[#F2F2F2] dark:bg-darkSecondary2 hover:bg-[#ECF4FF] ltr:mr-3 lg:ltr:mr-6 rtl:ml-3 lg:rtl:ml-6 flex items-center justify-center cursor-pointer ${
          showTooltip ? 'has-tooltip' : ''
        }`}
        onClick={() => toggleSharedNotePad()}
      >
        <span className="tooltip">{text()}</span>
        <>
          <i className={`pnm-notepad ${iconCSS} text-[14px] lg:text-[16px]`} />
        </>
      </div>
    );
  };

  return <>{sharedNotepadStatus ? render() : null}</>;
};

export default SharedNotePadIcon;
