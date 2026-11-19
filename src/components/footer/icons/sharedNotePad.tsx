import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create, toBinary } from '@bufbuild/protobuf';
import { ChangeVisibilityResSchema } from 'plugnmeet-protocol-js';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateIsActiveSharedNotePad } from '../../../store/slices/bottomIconsActivitySlice';
import { SharedNotepadIconSVG } from '../../../assets/Icons/SharedNotepadIconSVG';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { isAIAgentSessionRoom } from '../../insights-ai/featureGate';

const SharedNotePadIcon = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isInitialMount = useRef(true);
  /** The value a local click pushed, so only that echo is ignored. */
  const isLocalAction = useRef<boolean | null>(null);
  const { showTooltip, isRecorder, roomId, currentUserId, isAiAgentSession } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      isRecorder: !!currentUser?.isRecorder,
      roomId: session.currentRoom.roomId,
      currentUserId: currentUser?.userId,
      isAiAgentSession: isAIAgentSessionRoom(session.currentRoom.metadata),
    };
  }, []);

  const isActiveSharedNotePad = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveSharedNotePad,
  );
  const isNotepadEnabled = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.isActive,
  );
  const isNotepadVisibleByPresenter = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.roomFeatures?.sharedNotePadFeatures?.visible,
  );
  const isPresenter = useAppSelector(
    (state) => participantsSelector.selectById(state, currentUserId ?? '')?.metadata.isPresenter,
  );

  const [shouldRenderIcon, setShouldRenderIcon] = useState<boolean>(false);

  const canControlNotepad = useMemo(() => {
    // only user who is admin and presenter can control whiteboard
    return !isAiAgentSession && isPresenter && !isRecorder;
  }, [isPresenter, isRecorder, isAiAgentSession]);

  useEffect(() => {
    if (isRecorder) {
      // the recorder will follow the Presenter
      setShouldRenderIcon(isNotepadVisibleByPresenter);
    } else {
      setShouldRenderIcon(isNotepadEnabled);
    }
  }, [isRecorder, isNotepadVisibleByPresenter, isNotepadEnabled]);

  // The presenter (or the AI agent switching to its whiteboard) decides whether
  // the pad is open. Only the echo of our own click is ignored.
  useEffect(() => {
    if (!isNotepadEnabled) {
      return;
    }
    const locallyPushed = isLocalAction.current;
    isLocalAction.current = null;
    if (locallyPushed !== null && locallyPushed === isNotepadVisibleByPresenter) {
      return;
    }
    dispatch(updateIsActiveSharedNotePad(isNotepadVisibleByPresenter));
  }, [isNotepadEnabled, isNotepadVisibleByPresenter, dispatch]);

  useEffect(() => {
    if (!canControlNotepad) {
      return;
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isActiveSharedNotePad === isNotepadVisibleByPresenter) {
      return;
    }

    const body = create(ChangeVisibilityResSchema, {
      roomId: roomId,
      visibleNotepad: isActiveSharedNotePad,
    });
    sendAPIRequest(
      'changeVisibility',
      toBinary(ChangeVisibilityResSchema, body),
      false,
      'application/protobuf',
    ).then();
  }, [isActiveSharedNotePad, isNotepadVisibleByPresenter, canControlNotepad, roomId]);

  const toggle = useCallback(async () => {
    isLocalAction.current = !isActiveSharedNotePad;
    dispatch(updateIsActiveSharedNotePad(!isActiveSharedNotePad));
  }, [isActiveSharedNotePad, dispatch]);

  const tooltipText = isActiveSharedNotePad
    ? t('footer.icons.hide-shared-notepad')
    : t('footer.icons.show-shared-notepad');

  return (
    shouldRenderIcon && (
      <button
        type="button"
        className={`sharedNotePad hidden md:block relative footer-icon cursor-pointer w-11 3xl:w-[52px] h-11 3xl:h-[52px] rounded-[15px] 3xl:rounded-[18px] border-[3px] 3xl:border-4 focus-ring ${
          isActiveSharedNotePad ? 'border-focus-ring dark:border-Gray-800' : 'border-transparent'
        }`}
        onClick={toggle}
        aria-label={tooltipText.toString()}
      >
        <div
          className={`footer-icon-bg h-full w-full flex items-center justify-center rounded-[12px] 3xl:rounded-[15px] border border-Gray-300 dark:border-Gray-700 shadow transition-all duration-300 hover:bg-gray-100 dark:hover:bg-Gray-700 text-Gray-950 dark:text-white ${
            showTooltip ? 'has-tooltip' : ''
          } ${
            isActiveSharedNotePad ? 'bg-gray-100 dark:bg-Gray-700' : 'bg-white dark:bg-Gray-800'
          }`}
        >
          <span className="tooltip">{tooltipText}</span>
          <SharedNotepadIconSVG classes="h-5 w-auto" />
        </div>
      </button>
    )
  );
};

export default SharedNotePadIcon;
