import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  RoomEndAPIReqSchema,
} from 'plugnmeet-protocol-js';

import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';
import { store } from '../../../store';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import { getNatsConn } from '../../../helpers/nats';

const EndMeetingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [alertText, setAlertText] = useState<string>('');

  const { t } = useTranslation();
  const conn = getNatsConn();
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

  function open() {
    if (isAdmin) {
      setAlertText(t('header.menus.alert.end').toString());
    } else {
      setAlertText(t('header.menus.alert.logout').toString());
    }

    setIsOpen(true);
  }

  const onConfirm = async () => {
    if (!isAdmin) {
      await conn.endSession('notifications.user-logged-out');
    } else {
      const session = store.getState().session;

      const body = create(RoomEndAPIReqSchema, {
        roomId: session.currentRoom.roomId,
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
        toast(res.msg, {
          type: 'error',
        });
      }
    }
  };

  return (
    <>
      <Button
        onClick={open}
        className="h-10 3xl:h-11 px-5 flex items-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
      >
        {isAdmin ? t('header.menus.end') : t('header.menus.logout')}
      </Button>

      <Dialog
        open={isOpen}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={() => setIsOpen(false)}
      >
        <div className="EndMeetingPopup fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-96 bg-white border border-Gray-200 shadow-virtualPOP p-6 rounded-xl overflow-hidden duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-base 3xl:text-lg font-semibold leading-7 text-Gray-950"
              >
                <span>{t('header.menus.alert.confirm')}</span>
                <Button onClick={() => setIsOpen(false)}>
                  <PopupCloseSVGIcon classes="text-Gray-600" />
                </Button>
              </DialogTitle>
              <div className="mt-5 3xl:mt-8 text-xs 3xl:text-sm leading-5 text-Gray-700">
                {alertText}
              </div>
              <div className="mt-5 3xl:mt-8 grid grid-cols-2 gap-3">
                <Button
                  className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-buttonShadow"
                  onClick={() => setIsOpen(false)}
                >
                  {t('close')}
                </Button>
                <Button
                  className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-white bg-Red-400 border border-Red-600 transition-all duration-300 hover:bg-Red-600 shadow-buttonShadow"
                  onClick={onConfirm}
                >
                  {t('ok')}
                </Button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default EndMeetingButton;
