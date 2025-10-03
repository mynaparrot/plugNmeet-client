import React from 'react';
import { useTranslation } from 'react-i18next';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  SwitchPresenterReqSchema,
  SwitchPresenterTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';

interface ISwitchPresenterMenuItemProps {
  userId: string;
}

const SwitchPresenterMenuItem = ({ userId }: ISwitchPresenterMenuItemProps) => {
  const isPresenter = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.isPresenter,
  );
  const { t } = useTranslation();

  const togglePresenterStatus = async () => {
    const body = create(SwitchPresenterReqSchema, {
      userId: userId,
      task: isPresenter
        ? SwitchPresenterTask.DEMOTE
        : SwitchPresenterTask.PROMOTE,
    });

    const r = await sendAPIRequest(
      'switchPresenter',
      toBinary(SwitchPresenterReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast(t('left-panel.menus.notice.presenter-changed'), {
        toastId: 'lock-setting-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        toastId: 'lock-setting-status',
        type: 'error',
      });
    }
  };

  return (
    <MenuItem>
      {() => (
        <button
          className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-Gray-950 px-3 rounded-lg transition-all duration-300 hover:bg-Gray-50"
          onClick={togglePresenterStatus}
        >
          {isPresenter
            ? t('footer.icons.demote-presenter')
            : t('footer.icons.promote-presenter')}
        </button>
      )}
    </MenuItem>
  );
};

export default SwitchPresenterMenuItem;
