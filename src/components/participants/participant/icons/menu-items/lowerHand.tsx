import React from 'react';
import { Menu } from '@headlessui/react';

import { store, useAppDispatch, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { updateIsActiveRaisehand } from '../../../../../store/slices/bottomIconsActivitySlice';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  CommonResponse,
  DataMessageReq,
} from '../../../../../helpers/proto/plugnmeet_common_api_pb';
import { DataMsgBodyType } from '../../../../../helpers/proto/plugnmeet_datamessage_pb';

interface ILowerHandMenuItemProps {
  userId: string;
}

const LowerHandMenuItem = ({ userId }: ILowerHandMenuItemProps) => {
  const participant = useAppSelector((state) =>
    participantsSelector.selectById(state, userId),
  );
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const onClick = async () => {
    const session = store.getState().session;
    const body = new DataMessageReq({
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.room_id,
      msgBodyType: DataMsgBodyType.OTHER_USER_LOWER_HAND,
      msg: participant?.userId,
    });

    const r = await sendAPIRequest(
      'dataMessage',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

    if (res.status) {
      dispatch(updateIsActiveRaisehand(false));
    } else {
      toast(t(res.msg), {
        type: 'error',
      });
    }
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

  return <>{participant?.metadata.raised_hand ? render() : null}</>;
};

export default LowerHandMenuItem;
