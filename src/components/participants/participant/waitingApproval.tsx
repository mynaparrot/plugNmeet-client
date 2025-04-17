import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  ApproveWaitingUsersReqSchema,
  CommonResponseSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';

interface IWaitingApprovalProps {
  userId: string;
  name: string;
  openRemoveParticipantAlert(userId: string, type: string): void;
}
const WaitingApproval = ({
  userId,
  name,
  openRemoveParticipantAlert,
}: IWaitingApprovalProps) => {
  const waitForApproval = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.waitForApproval,
  );
  const { t } = useTranslation();

  const approve = async () => {
    const body = create(ApproveWaitingUsersReqSchema, {
      userId: userId,
    });

    const r = await sendAPIRequest(
      'waitingRoom/approveUsers',
      toBinary(ApproveWaitingUsersReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(t('left-panel.menus.notice.user-approved', { name: name }), {
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
  };

  const reject = () => {
    openRemoveParticipantAlert(userId, 'reject');
  };

  return !waitForApproval ? null : (
    <div className="approve-btn-wrap rtl:pt-2">
      <button
        className="text-xs text-white py-[1px] px-2 rounded-lg transition ease-in bg-primaryColor hover:bg-secondaryColor"
        onClick={approve}
      >
        {t('left-panel.approve')}
      </button>
      <button
        className="text-xs text-white py-[1px] px-2 rounded-lg transition ease-in bg-red-600 hover:bg-red-800 ltr:ml-2 rtl:mr-2"
        onClick={reject}
      >
        {t('left-panel.reject')}
      </button>
    </div>
  );
};

export default WaitingApproval;
