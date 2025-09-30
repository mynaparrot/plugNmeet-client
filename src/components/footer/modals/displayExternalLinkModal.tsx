import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalDisplayLinkReqSchema,
  ExternalDisplayLinkTask,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '../../../store';
import { updateDisplayExternalLinkRoomModal } from '../../../store/slices/bottomIconsActivitySlice';
import sendAPIRequest from '../../../helpers/api/plugNmeetAPI';
import Modal from '../../../helpers/ui/modal';
import FormattedInputField from '../../../helpers/ui/formattedInputField';
import ActionButton from '../../../helpers/ui/actionButton';
import Checkbox from '../../../helpers/ui/checkbox';

const DisplayExternalLinkModal = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const [link, setLink] = useState<string>('');
  const [extraValues, setExtraValues] = useState({
    name: false,
    userId: false,
    role: false,
    meetingId: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  const closeStartModal = () => {
    dispatch(updateDisplayExternalLinkRoomModal(false));
  };

  const handleCheckboxChange = useCallback((key: keyof typeof extraValues) => {
    setExtraValues((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let url: URL;
    try {
      url = new URL(link);
    } catch (e) {
      console.error(e);
      toast.error(t('external-display-link-display.link-invalid'));
      return;
    }

    const session = store.getState().session;
    if (extraValues.name) {
      url.searchParams.set('name', session.currentUser?.name ?? '');
    }
    if (extraValues.userId) {
      url.searchParams.set('userId', session.currentUser?.userId ?? '');
    }
    if (extraValues.role) {
      url.searchParams.set(
        'role',
        session.currentUser?.metadata?.isAdmin ? 'admin' : 'participant',
      );
    }
    if (extraValues.meetingId) {
      url.searchParams.set('meetingId', session.currentRoom.roomId);
    }

    setIsLoading(true);
    const id = toast.loading(t('please-wait'), {
      type: 'info',
    });

    const body = create(ExternalDisplayLinkReqSchema, {
      task: ExternalDisplayLinkTask.START_EXTERNAL_LINK,
      url: url.toString(),
    });
    const r = await sendAPIRequest(
      'externalDisplayLink',
      toBinary(ExternalDisplayLinkReqSchema, body),
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
        autoClose: 1000,
      });
    }

    toast.dismiss(id);
    setIsLoading(false);
    dispatch(updateDisplayExternalLinkRoomModal(false));
  };

  const renderDisplayForm = () => {
    return (
      <Modal
        show={!isActive}
        onClose={closeStartModal}
        title={t('external-display-link-display.modal-title')}
      >
        <form method="POST" onSubmit={onSubmit}>
          <FormattedInputField
            id="link"
            placeholder={t('external-display-link-display.url')}
            value={link}
            onChange={(e) => setLink(e.currentTarget.value)}
          />
          <div className="text-xs py-2 text-Gray-800">
            {t('external-display-link-display.note')}
          </div>

          <div className="mt-4">
            <fieldset>
              <div
                className="text-base font-medium text-gray-900 "
                aria-hidden="true"
              >
                {t('external-display-link-display.send-extra-values')}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-5">
                <Checkbox
                  id="name"
                  label={t('external-display-link-display.name')}
                  description={t('external-display-link-display.name-des')}
                  checked={extraValues.name}
                  onChange={() => handleCheckboxChange('name')}
                />
                <Checkbox
                  id="user-id"
                  label={t('external-display-link-display.user-id')}
                  description={t('external-display-link-display.user-id-des')}
                  checked={extraValues.userId}
                  onChange={() => handleCheckboxChange('userId')}
                />
                <Checkbox
                  id="user-role"
                  label={t('external-display-link-display.user-role')}
                  description={t('external-display-link-display.user-role-des')}
                  checked={extraValues.role}
                  onChange={() => handleCheckboxChange('role')}
                />
                <Checkbox
                  id="meeting-id"
                  label={t('external-display-link-display.meeting-id')}
                  description={t(
                    'external-display-link-display.meeting-id-des',
                  )}
                  checked={extraValues.meetingId}
                  onChange={() => handleCheckboxChange('meetingId')}
                />
              </div>
            </fieldset>
          </div>
          <div className="mt-8 flex justify-end">
            <ActionButton isLoading={isLoading}>
              {t('external-display-link-display.display')}
            </ActionButton>
          </div>
        </form>
      </Modal>
    );
  };

  return !isActive && renderDisplayForm();
};

export default DisplayExternalLinkModal;
