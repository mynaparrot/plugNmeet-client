import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  ActivatePollsReqSchema,
  CommonResponseSchema,
} from 'plugnmeet-protocol-js';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '../../../../../store';
import sendAPIRequest from '../../../../../helpers/api/plugNmeetAPI';
import { updateIsActivePollsPanel } from '../../../../../store/slices/bottomIconsActivitySlice';

const usePolls = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isActivePoll = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
  );

  const togglePolls = useCallback(async () => {
    const id = toast.loading(t('please-wait'), {
      type: 'info',
    });

    const body = create(ActivatePollsReqSchema, {
      isActive: !isActivePoll,
    });
    const r = await sendAPIRequest(
      'polls/activate',
      toBinary(ActivatePollsReqSchema, body),
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
      dispatch(updateIsActivePollsPanel(true));
    }
  }, [isActivePoll, dispatch, t]);

  return { togglePolls, isActivePoll };
};

export default usePolls;
