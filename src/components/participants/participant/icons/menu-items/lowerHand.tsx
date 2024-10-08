import React from 'react';
import { Menu } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  NatsMsgClientToServerSchema,
  NatsMsgClientToServerEvents,
} from 'plugnmeet-protocol-js';
import { create } from '@bufbuild/protobuf';

import { useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { getNatsConn } from '../../../../../helpers/nats';

interface ILowerHandMenuItemProps {
  userId: string;
}

const LowerHandMenuItem = ({ userId }: ILowerHandMenuItemProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const { t } = useTranslation();
  const conn = getNatsConn();

  const onClick = async () => {
    const data = create(NatsMsgClientToServerSchema, {
      event: NatsMsgClientToServerEvents.REQ_LOWER_OTHER_USER_HAND,
      msg: participant?.userId,
    });
    await conn.sendMessageToSystemWorker(data);
  };

  const render = () => {
    return (
      <div className="" role="none">
        <Menu.Item>
          {() => (
            <button
              className="text-gray-900 dark:text-darkText group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-primaryColor hover:text-white"
              onClick={() => onClick()}
            >
              {t('footer.icons.lower-hand')}
            </button>
          )}
        </Menu.Item>
      </div>
    );
  };

  return <>{participant?.metadata.raisedHand ? render() : null}</>;
};

export default LowerHandMenuItem;
