import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { CreateBreakoutRoomsReq } from 'plugnmeet-protocol-js';

import FormElems from './form';
import ManageActiveRooms from './manage-active-rooms';
import Modal from '../../helpers/ui/modal';

import { useAppDispatch, useAppSelector } from '../../store';
import { updateShowManageBreakoutRoomModal } from '../../store/slices/bottomIconsActivitySlice';
import { useCreateBreakoutRoomsMutation } from '../../store/services/breakoutRoomApi';
import {
  seedBreakoutContent,
  hasWhiteboardShare,
} from './utils/breakoutRoomSeeding';

export interface BreakoutRoomMessage {
  text: string;
  type: 'info' | 'error';
}

const BreakoutRoom = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState<BreakoutRoomMessage | null>(null);

  const breakoutRoomIsActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures
        ?.isActive,
  );
  // Inside a breakout room the local breakout feature is disabled, but an admin
  // must still be able to manage the parent's rooms. In that context we always
  // show the management view (rooms are already created; creation is main-room
  // only).
  const isBreakoutRoom = useAppSelector(
    (state) => !!state.session.currentRoom.metadata?.isBreakoutRoom,
  );

  const [createBreakoutRoom, { isLoading, data, error, isSuccess }] =
    useCreateBreakoutRoomsMutation();

  // Capture the last create request so the post-create success handler can seed
  // content (the request carries whiteboardShare/shareNotepad; the response does not).
  const lastCreateReqRef = useRef<CreateBreakoutRoomsReq | null>(null);

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        toast(t('breakout-room.rooms-created'), {
          type: 'info',
        });
        dispatch(updateShowManageBreakoutRoomModal(false));

        const req = lastCreateReqRef.current;
        const wbRequested = hasWhiteboardShare(req?.whiteboardShare);
        const npRequested = !!req?.shareNotepad;
        // Only seed + toast when a real share was requested.
        if (wbRequested || npRequested) {
          void seedBreakoutContent({
            rooms: data.rooms,
            whiteboardShare: req?.whiteboardShare,
            shareNotepad: npRequested,
          }).then((res) => {
            if (res.total === 0) {
              return;
            }
            const npShared = npRequested && !res.notepadSkipped;
            if (!wbRequested && !npShared) {
              // notepad was the only requested content and it was skipped: nothing was shared
              toast(t('breakout-room.content-share-skipped-notepad'), {
                type: 'warning',
              });
              return;
            }
            if (res.shared === res.total) {
              toast(
                wbRequested && npShared
                  ? t('breakout-room.content-shared-both', {
                      count: res.shared,
                    })
                  : wbRequested
                    ? t('breakout-room.content-shared', { count: res.shared })
                    : t('breakout-room.notepad-shared', { count: res.shared }),
                { type: 'info' },
              );
            } else if (res.shared > 0) {
              toast(
                t('breakout-room.content-shared-partial', {
                  shared: res.shared,
                  total: res.total,
                }),
                { type: 'warning' },
              );
            } else {
              toast(t('breakout-room.content-share-failed'), {
                type: 'error',
              });
            }
            if (res.notepadSkipped) {
              toast(t('breakout-room.content-share-skipped-notepad'), {
                type: 'warning',
              });
            }
          });
        }
      } else {
        setMessage({ text: t(data.msg ?? ''), type: 'error' });
      }
    } else if (error) {
      const msg = (error as any)?.data?.msg ?? 'Unknown error';
      setMessage({ text: t(msg), type: 'error' });
    }
  }, [isSuccess, data, error, dispatch, t]);

  const handleCreateBreakoutRooms = (req: CreateBreakoutRoomsReq) => {
    // clean previous error
    setMessage(null);
    lastCreateReqRef.current = req;
    createBreakoutRoom(req);
  };

  return (
    <Modal
      show={true}
      onClose={() => dispatch(updateShowManageBreakoutRoomModal(false))}
      title={t('breakout-room.modal-title')}
      customClass="breakoutRoomModal"
      maxWidth="max-w-4xl"
    >
      <div className="mt-0">
        {message && (
          <div
            className={`py-2 px-4 rounded-lg mb-4 text-sm ${
              message.type === 'error'
                ? 'text-red-600 bg-red-50 dark:bg-red-100 dark:text-red-700'
                : 'text-blue-600 bg-blue-50 dark:bg-dark-secondary2 dark:text-white'
            }`}
          >
            {message.text}
          </div>
        )}
        {breakoutRoomIsActive || isBreakoutRoom ? (
          <ManageActiveRooms setMessage={setMessage} />
        ) : (
          <FormElems
            createBreakoutRooms={handleCreateBreakoutRooms}
            isLoading={isLoading}
            setMessage={setMessage}
          />
        )}
      </div>
    </Modal>
  );
};

export default BreakoutRoom;
