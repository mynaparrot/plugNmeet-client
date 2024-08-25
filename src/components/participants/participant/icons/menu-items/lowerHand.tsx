import React from 'react';
import { Menu } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { getNatsConn } from '../../../../../helpers/nats';
import {
  NatsMsgClientToServer,
  NatsMsgClientToServerEvents,
} from '../../../../../helpers/proto/plugnmeet_nats_msg_pb';

interface ILowerHandMenuItemProps {
  userId: string;
}

const LowerHandMenuItem = ({ userId }: ILowerHandMenuItemProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const { t } = useTranslation();

  const onClick = async () => {
    const conn = getNatsConn();
    const data = new NatsMsgClientToServer({
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
