import React, { useEffect, useState } from 'react';
// import { useTranslation } from 'react-i18next';
import {
  ChangeVisibilityRes,
  ChangeVisibilityResSchema,
} from 'plugnmeet-protocol-js';
import { create, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import {
  // updateIsActiveChatPanel,
  updateIsActiveWhiteboard,
} from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { WhiteBoardIconSVG } from '../../../assets/Icons/WhiteBoardIconSVG';
// import { BlockedIcon } from '../../../assets/Icons/BlockedIcon';

const WhiteboardIcon = () => {
  // const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showTooltip = store.getState().session.userDeviceType === 'desktop';
  // const [iconCSS, setIconCSS] = useState<string>('primaryColor');
  const [initiated, setInitiated] = useState<boolean>(false);
  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const isVisible = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures
        ?.visible,
  );

  const allowedWhiteboard =
    store.getState().session.currentRoom.metadata?.roomFeatures
      ?.whiteboardFeatures?.allowedWhiteboard;
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;
  const isRecorder = store.getState().session.currentUser?.isRecorder;

  // useEffect(() => {
  //   if (isActiveWhiteboard) {
  //     setIconCSS('secondaryColor');
  //     if (!isRecorder) {
  //       dispatch(updateIsActiveChatPanel(false));
  //     }
  //   } else {
  //     setIconCSS('primaryColor dark:text-darkText');
  //   }
  //   //eslint-disable-next-line
  // }, [dispatch, isActiveWhiteboard]);

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
      currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible
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
      isActiveWhiteboard &&
      !currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible
    ) {
      const body = create(ChangeVisibilityResSchema, {
        roomId: currentRoom.roomId,
        visibleWhiteBoard: true,
      });
      // wait little bit before change visibility
      setTimeout(() => {
        sendRequest(body).then();
      }, 500);
    } else if (
      !isActiveWhiteboard &&
      currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible
    ) {
      const body = create(ChangeVisibilityResSchema, {
        roomId: currentRoom.roomId,
        visibleWhiteBoard: false,
      });
      sendRequest(body).then();
    }
    //eslint-disable-next-line
  }, [isActiveWhiteboard]);

  // const text = () => {
  //   if (isActiveWhiteboard) {
  //     return t('footer.icons.hide-whiteboard');
  //   } else {
  //     return t('footer.icons.show-whiteboard');
  //   }
  // };

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
        className={`whiteboard relative footer-icon flex items-center justify-center cursor-pointer w-11 h-11 rounded-[15px] border border-Gray-300 shadow transition-all duration-300 hover:bg-gray-100 text-Gray-950 ${
          showTooltip ? 'has-tooltip' : ''
        } ${isActiveWhiteboard ? 'bg-gray-100' : 'bg-white'}`}
        onClick={() => toggleWhiteboard()}
      >
        {/* <span className="tooltip">{text()}</span> */}
        <>
          <WhiteBoardIconSVG />
          {/* <span className="blocked absolute -top-2 -right-2 z-10">
            <BlockedIcon />
          </span> */}
        </>
      </div>
    );
  };

  return <>{allowedWhiteboard ? render() : null}</>;
};

export default WhiteboardIcon;
