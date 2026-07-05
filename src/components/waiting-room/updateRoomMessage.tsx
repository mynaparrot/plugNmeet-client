import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  UpdateWaitingRoomMessageReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';
import { LoadingIcon } from '../../assets/Icons/Loading';

interface IFeedbackState {
  type: 'success' | 'error';
  message: string;
}

const UpdateRoomMessage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const waitingRoomMessage = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.waitingRoomFeatures
        ?.waitingRoomMsg,
  );
  const [message, setMessage] = useState<string>(waitingRoomMessage ?? '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<IFeedbackState | null>(null);

  // Automatically clear success feedback after 4 seconds
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const updateRoomMsg = useCallback(async () => {
    if (message === '' || isUpdating) {
      return;
    }
    setIsUpdating(true);
    setFeedback(null);

    const body = create(UpdateWaitingRoomMessageReqSchema, {
      msg: message,
    });

    try {
      const r = await sendAPIRequest(
        'waitingRoom/updateMsg',
        toBinary(UpdateWaitingRoomMessageReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (res.status) {
        setFeedback({
          type: 'success',
          message: t('waiting-room.updated-msg'),
        });
        dispatch(
          addUserNotification({
            message: t('waiting-room.updated-msg'),
            typeOption: 'info',
          }),
        );
      } else {
        setFeedback({
          type: 'error',
          message: t(res.msg),
        });
        dispatch(
          addUserNotification({
            message: t(res.msg),
            typeOption: 'error',
          }),
        );
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: t('waiting-room.error-occurred'),
      });
    } finally {
      setIsUpdating(false);
    }
  }, [message, isUpdating, dispatch, t]);

  return (
    <div className="text-right mb-4">
      <p className="block text-sm font-medium text-Gray-800 dark:text-white text-left mb-2">
        {t('waiting-room.update-waiting-message')}
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        disabled={isUpdating}
        className="border border-Gray-300 dark:border-Gray-800 bg-white dark:bg-dark-primary shadow-input block px-3 py-2 w-full h-20 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus text-gray-950 dark:text-white"
      ></textarea>
      <div className="flex items-center justify-between mt-2 gap-4">
        <div className="flex-1 text-left">
          {feedback && (
            <p
              className={`text-xs font-semibold ${
                feedback.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
        <button
          onClick={updateRoomMsg}
          disabled={isUpdating || message === ''}
          className="primary-button h-9 cursor-pointer px-5 text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating && (
            <LoadingIcon className="w-4 h-4 animate-spin" fillColor="#fff" />
          )}
          {t('waiting-room.update-msg')}
        </button>
      </div>
    </div>
  );
};

export default UpdateRoomMessage;
