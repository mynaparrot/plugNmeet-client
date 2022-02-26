import React from 'react';
import { Menu } from '@headlessui/react';
import { store, useAppDispatch, useAppSelector } from '../../../../../store';
import { participantsSelector } from '../../../../../store/slices/participantSlice';
import { SystemMsgType } from '../../../../../store/slices/interfaces/dataMessages';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { updateIsActiveRaisehand } from '../../../../../store/slices/bottomIconsActivitySlice';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

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
    const body = {
      sid: session.currentRoom.sid,
      room_id: session.currentRoom.room_id,
      msg_type: SystemMsgType.OTHER_USER_LOWER_HAND,
      msg: participant?.userId,
    };

    const res = await sendAPIRequest('dataMessage', body);
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
        <Menu.Item onClick={() => onClick()}>
          {() => (
            <button className="text-gray-900 group flex rounded-md items-center text-left w-full px-2 py-[0.4rem] text-xs lg:text-sm transition ease-in hover:bg-brandColor1 hover:text-white">
              {t('footer.icons.lower-hand')}
            </button>
          )}
        </Menu.Item>
      </div>
    );
  };

  return (
    <React.Fragment>
      {participant?.metadata.raised_hand ? render() : null}
    </React.Fragment>
  );
};

export default LowerHandMenuItem;
