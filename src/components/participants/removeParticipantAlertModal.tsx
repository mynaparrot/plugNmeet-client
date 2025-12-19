import React, { Fragment, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponseSchema,
  RemoveParticipantReqSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store } from '../../store';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import Modal from '../../helpers/ui/modal';
import RadioOptions from '../../helpers/ui/radioOptions';

export interface IRemoveParticipantAlertModalData {
  name: string;
  userId: string;
  removeType: string;
}

interface IRemoveParticipantAlertModalProps {
  name: string;
  userId: string;
  removeType: string;
  closeAlertModal: () => void;
}

const RemoveParticipantAlertModal = ({
  name,
  userId,
  removeType,
  closeAlertModal,
}: IRemoveParticipantAlertModalProps) => {
  const { t } = useTranslation();
  const [blockUser, setBlockUser] = useState<number>(0);

  const onCloseRemoveParticipantAlert = async (remove = false) => {
    if (!remove) {
      closeAlertModal();
      return;
    }

    const session = store.getState().session;
    const body = create(RemoveParticipantReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: userId,
      msg:
        removeType === 'remove'
          ? t('notifications.you-have-removed').toString()
          : t('notifications.you-have-reject').toString(),
      blockUser: blockUser === 1,
    });

    const r = await sendAPIRequest(
      'removeParticipant',
      toBinary(RemoveParticipantReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(t('left-panel.menus.notice.participant-removed'), {
        toastId: 'user-remove-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
    closeAlertModal();
  };

  const renderButtons = () => {
    return (
      <Fragment>
        <button
          className="h-10 px-5 w-32 flex items-center justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow cursor-pointer"
          onClick={() => onCloseRemoveParticipantAlert(true)}
        >
          {t('left-panel.menus.notice.remove')}
        </button>
        <button
          type="button"
          className="primary-button h-10 px-5 w-32 flex items-center justify-center text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer ml-4"
          onClick={() => onCloseRemoveParticipantAlert(false)}
        >
          {t('cancel')}
        </button>
      </Fragment>
    );
  };

  return (
    <Modal
      show={true}
      onClose={() => onCloseRemoveParticipantAlert(false)}
      title={t('left-panel.menus.notice.confirm', {
        name,
      })}
      renderButtons={renderButtons}
    >
      <div className="mb-2 pl-3">
        <p className="text-sm text-gray-500 dark:text-dark-text">
          {t('left-panel.menus.notice.want-to-block')}
        </p>
        <RadioOptions
          name="block"
          checked={blockUser}
          onChange={setBlockUser}
          options={[
            {
              id: 'yes',
              value: 1,
              label: t('yes'),
            },
            {
              id: 'no',
              value: 0,
              label: t('no'),
            },
          ]}
        />
      </div>
    </Modal>
  );
};

export default RemoveParticipantAlertModal;
