import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create, toBinary } from '@bufbuild/protobuf';
import {
  ChangeVisibilityRes,
  ChangeVisibilityResSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveSharedNotePad } from '../../../store/slices/bottomIconsActivitySlice';
import { SharedNotepadIconSVG } from '../../../assets/Icons/SharedNotepadIconSVG';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

const SharedNotePadIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showTooltip, isRecorder, isPresenter, roomId } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      isRecorder: !!currentUser?.isRecorder,
      isPresenter: !!currentUser?.metadata?.isPresenter,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const isNotepadEnabled = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.isActive,
  );
  const isNotepadVisibleByPresenter = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures
        ?.visible,
  );

  const [shouldRenderIcon, setShouldRenderIcon] = useState<boolean>(false);

  useEffect(() => {
    if (isRecorder) {
      // the recorder will follow the Presenter
      setShouldRenderIcon(isNotepadVisibleByPresenter);
    } else {
      setShouldRenderIcon(isNotepadEnabled);
    }
  }, [isRecorder, isNotepadVisibleByPresenter, isNotepadEnabled]);

  useEffect(() => {
    dispatch(updateIsActiveSharedNotePad(shouldRenderIcon));
  }, [shouldRenderIcon, dispatch]);

  useEffect(() => {
    if (isPresenter) {
      const sendRequest = async (body: ChangeVisibilityRes) => {
        await sendAPIRequest(
          'changeVisibility',
          toBinary(ChangeVisibilityResSchema, body),
          false,
          'application/protobuf',
        );
      };

      const body = create(ChangeVisibilityResSchema, {
        roomId: roomId,
        visibleNotepad: isActiveSharedNotePad,
      });
      sendRequest(body).then();
    }
  }, [isActiveSharedNotePad, isPresenter, roomId]);

  const toggle = useCallback(async () => {
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  }, [isActiveSharedNotePad, dispatch]);

  return (
    shouldRenderIcon && (
      <div
        className={`sharedNotePad hidden md:block relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 ${
          isActiveSharedNotePad
            ? 'border-[rgba(124,206,247,0.25)] dark:border-Gray-800'
            : 'border-transparent'
        }`}
        onClick={toggle}
      >
        <div
          className={`footer-icon-bg h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white ${
            showTooltip ? 'has-tooltip' : ''
          } ${
            isActiveSharedNotePad
              ? 'bg-gray-100 dark:bg-Gray-700'
              : 'bg-white dark:bg-Gray-800'
          }`}
        >
          <span className="tooltip">
            {isActiveSharedNotePad
              ? t('footer.icons.hide-shared-notepad')
              : t('footer.icons.show-shared-notepad')}
          </span>
          <SharedNotepadIconSVG />
        </div>
      </div>
    )
  );
};

export default SharedNotePadIcon;
