import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import { toast } from 'react-toastify';

import { RootState, useAppSelector } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import {
  CommonResponse,
  UpdateWaitingRoomMessageReq,
} from '../../helpers/proto/plugnmeet_common_api_pb';

const waitingRoomMessageSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.waiting_room_features,
  (waiting_room_features) => waiting_room_features?.waiting_room_msg,
);

const UpdateRoomMessage = () => {
  const { t } = useTranslation();
  const waitingRoomMessage = useAppSelector(waitingRoomMessageSelector);
  const [message, setMessage] = useState<string>(waitingRoomMessage ?? '');

  const updateRoomMsg = async () => {
    if (isEmpty(message)) {
      return;
    }
    const body = new UpdateWaitingRoomMessageReq({
      msg: message,
    });

    const r = await sendAPIRequest(
      'waitingRoom/updateMsg',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

    if (res.status) {
      toast(t('waiting-room.updated-msg'), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
  };

  return (
    <div className="mb-4 text-right">
      <p className="text-sm text-black dark:text-darkText capitalize mb-2 block text-left">
        {t('waiting-room.update-waiting-message')}
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        className="border border-solid border-primaryColor/20 dark:border-darkText bg-transparent h-20 w-full block p-3 rounded-xl outline-none text-sm dark:text-darkText"
      ></textarea>
      <button
        onClick={updateRoomMsg}
        className="py-1 px-6 mt-2 rounded-xl text-white text-sm inline-block mr-0 ml-auto transition ease-in bg-primaryColor hover:bg-secondaryColor"
      >
        {t('waiting-room.update-msg')}
      </button>
    </div>
  );
};

export default UpdateRoomMessage;
