import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  RoomEndAPIReqSchema,
} from 'plugnmeet-protocol-js';
import { Button } from '@headlessui/react';

import { store } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { getNatsConn } from '../../../helpers/nats';
import ConfirmationModal from '../../../helpers/ui/confirmationModal';

const EndMeetingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [alertText, setAlertText] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const { t } = useTranslation();
  const conn = getNatsConn();
  const { isAdmin, roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      isAdmin: session.currentUser?.metadata?.isAdmin,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  function open() {
    if (isAdmin) {
      setAlertText(t('header.menus.alert.end').toString());
    } else {
      setAlertText(t('header.menus.alert.logout').toString());
    }

    setIsOpen(true);
  }

  const onConfirm = useCallback(async () => {
    if (isBusy) {
      return;
    }
    setIsBusy(true);

    if (!isAdmin) {
      await conn.endSession('notifications.user-logged-out');
    } else {
      const id = toast.loading(t('notifications.ending-session'), {
        type: 'info',
      });

      const body = create(RoomEndAPIReqSchema, {
        roomId: roomId,
      });
      const r = await sendAPIRequest(
        'endRoom',
        toBinary(RoomEndAPIReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      if (!res.status) {
        toast.update(id, {
          render: t(res.msg),
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        toast.dismiss(id);
      }
    }
    setIsBusy(false);
    setIsOpen(false);
  }, [isBusy, isAdmin, conn, roomId, t]);

  return (
    <>
      <Button
        onClick={open}
        className="h-10 3xl:h-11 px-5 flex items-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-button-shadow cursor-pointer"
      >
        {isAdmin ? t('header.menus.end') : t('header.menus.logout')}
      </Button>

      <ConfirmationModal
        show={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={onConfirm}
        title={t('header.menus.alert.confirm')}
        text={alertText}
      />
    </>
  );
};

export default EndMeetingButton;
