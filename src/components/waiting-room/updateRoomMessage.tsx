import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
import { isEmpty } from 'lodash';
import { toast } from 'react-toastify';

import { RootState, useAppSelector } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';

const waitingRoomMessageSelector = createSelector(
  (state: RootState) =>
    state.session.currentRoom.metadata?.room_features.waiting_room_features
      .waiting_room_msg,
  (waiting_room_msg) => waiting_room_msg,
);

const UpdateRoomMessage = () => {
  const { t } = useTranslation();
  const waitingRoomMessage = useAppSelector(waitingRoomMessageSelector);
  const [message, setMessage] = useState<string>(waitingRoomMessage ?? '');

  const updateRoomMsg = async () => {
    if (isEmpty(message)) {
      return;
    }
    const data = {
      msg: message,
    };

    const res = await sendAPIRequest('waitingRoom/updateMsg', data);
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
    <div className="m-10">
      <p>{t('waiting-room.update-waiting-message')}</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
      ></textarea>
      <button onClick={updateRoomMsg}>{t('waiting-room.update-msg')}</button>
    </div>
  );
};

export default UpdateRoomMessage;
