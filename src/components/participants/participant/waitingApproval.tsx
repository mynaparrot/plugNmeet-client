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
import { CloseIconSVG } from '../../../assets/Icons/CloseIconSVG';
import { CheckMarkIcon } from '../../../assets/Icons/CheckMarkIcon';

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
    <div className="approve-btn-wrap absolute right-0 top-0 flex gap-2.5 items-center justify-end h-full w-auto bg-white">
      <button
        className="h-6 px-2 flex items-center gap-1 text-xs font-semibold bg-Blue2-500 hover:bg-Blue2-600 border border-Blue2-600 rounded-[8px] text-white transition-all duration-300 shadow-buttonShadow"
        onClick={approve}
      >
        <CheckMarkIcon />
        {t('left-panel.approve')}
      </button>
      <button
        className="h-6 w-6 flex items-center rounded-[8px] text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
        onClick={reject}
      >
        <CloseIconSVG />
        {/* {t('left-panel.reject')} */}
      </button>
    </div>
  );
};

export default WaitingApproval;
