import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  UpdateWaitingRoomMessageReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { addUserNotification } from '../../store/slices/roomSettingsSlice';

const UpdateRoomMessage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const waitingRoomMessage = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.waitingRoomFeatures
        ?.waitingRoomMsg,
  );
  const [message, setMessage] = useState<string>(waitingRoomMessage ?? '');

  const updateRoomMsg = async () => {
    if (message === '') {
      return;
    }
    const body = create(UpdateWaitingRoomMessageReqSchema, {
      msg: message,
    });

    const r = await sendAPIRequest(
      'waitingRoom/updateMsg',
      toBinary(UpdateWaitingRoomMessageReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      dispatch(
        addUserNotification({
          message: t('waiting-room.updated-msg'),
          typeOption: 'info',
        }),
      );
    } else {
      dispatch(
        addUserNotification({
          message: t(res.msg),
          typeOption: 'error',
        }),
      );
    }
  };

  return (
    <div className="text-right">
      <p className="block text-sm font-medium text-Gray-800 text-left mb-2">
        {t('waiting-room.update-waiting-message')}
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        className="border border-Gray-300 bg-white shadow-input block px-3 py-2 w-full h-20 rounded-[15px] outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus"
      ></textarea>
      <button
        onClick={updateRoomMsg}
        className="h-9 ml-auto cursor-pointer mt-2 px-5 text-sm font-medium bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
      >
        {t('waiting-room.update-msg')}
      </button>
    </div>
  );
};

export default UpdateRoomMessage;
