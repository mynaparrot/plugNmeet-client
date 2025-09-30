import React from 'react';
import { MenuItem } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { getNatsConn } from '../../../../../helpers/nats';

interface ILowerHandMenuItemProps {
  userId: string;
}

const LowerHandMenuItem = ({ userId }: ILowerHandMenuItemProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );
  const { t } = useTranslation();
  const conn = getNatsConn();

  const lowerHand = async () => {
    const data = create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.REQ_LOWER_OTHER_USER_HAND,
      msg: userId,
    });
    conn.sendMessageToSystemWorker(data);
  };

  return (
    raisedHand && (
      <div className="" role="none">
        <MenuItem>
          {() => (
            <button
              className="text-Gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs font-medium transition ease-in hover:bg-Blue2-500 hover:text-white"
              onClick={lowerHand}
            >
              {t('footer.icons.lower-hand')}
            </button>
          )}
        </MenuItem>
      </div>
    )
  );
};

export default LowerHandMenuItem;
