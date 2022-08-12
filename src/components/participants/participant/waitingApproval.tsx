import React from 'react';
import { useAppSelector } from '../../../store';
import { participantsSelector } from '../../../store/slices/participantSlice';
import { useTranslation } from 'react-i18next';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';
import {
  ApproveWaitingUsersReq,
  CommonResponse,
} from '../../../helpers/proto/plugnmeet_common_api_pb';

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
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const { t } = useTranslation();

  const approve = async () => {
    const body = new ApproveWaitingUsersReq({
      userId: userId,
    });

    const r = await sendAPIRequest(
      'waitingRoom/approveUsers',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

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

  const render = () => {
    if (participant?.metadata.wait_for_approval) {
      return (
        <div className="approve-btn-wrap">
          <button
            className="text-xs text-white py-[1px] px-2 rounded-lg transition ease-in bg-primaryColor hover:bg-secondaryColor"
            onClick={approve}
          >
            {t('left-panel.approve')}
          </button>
          <button
            className="text-xs text-white py-[1px] px-2 rounded-lg transition ease-in bg-red-600 hover:bg-red-800 ml-2"
            onClick={reject}
          >
            {t('left-panel.reject')}
          </button>
        </div>
      );
    }

    return null;
  };

  return render();
};

export default WaitingApproval;
