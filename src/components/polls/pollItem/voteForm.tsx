import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { create } from '@bufbuild/protobuf';
import {
  DataMsgBodyType,
  SubmitPollResponseReqSchema,
} from 'plugnmeet-protocol-js';

import { store, useAppDispatch } from '../../../store';
import {
  useAddResponseMutation,
  useGetUserSelectedOptionQuery,
} from '../../../store/services/pollsApi';
import { getNatsConn } from '../../../helpers/nats';
import { PollDataWithOption } from '../utils';
import { addUserNotification } from '../../../store/slices/roomSettingsSlice';

interface PollFormProps {
  pollDataWithOption: PollDataWithOption;
  isRunning: boolean;
}

const PollForm = ({ pollDataWithOption, isRunning }: PollFormProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [selectedOption, setSelectedOption] = useState<number>();
  const [locked, setLocked] = useState<boolean>(false);
  const conn = getNatsConn();
  const currentUser = store.getState().session.currentUser;

  const [voted, setVoted] = useState<boolean>(false);
  const { data } = useGetUserSelectedOptionQuery({
    pollId: pollDataWithOption.pollId,
    userId: currentUser?.userId || '',
  });
  useEffect(() => {
    if (data && data.status && data.voted && Number(data.voted) > 0) {
      setVoted(true);
      setSelectedOption(Number(data.voted));
    }
  }, [data]);

  const [addResponse, { isLoading, data: addReqResponse }] =
    useAddResponseMutation();
  const onSubmit = (e: any) => {
    e.preventDefault();

    if (locked || selectedOption === 0 || isLoading) {
      return;
    }
    setLocked(true);
    addResponse(
      create(SubmitPollResponseReqSchema, {
        pollId: pollDataWithOption.pollId,
        userId: store.getState().session.currentUser?.userId ?? '',
        name: store.getState().session.currentUser?.name ?? '',
        selectedOption: `${selectedOption}`,
      }),
    );

    // notify to everyone
    if (conn) {
      conn.sendDataMessage(
        DataMsgBodyType.NEW_POLL_RESPONSE,
        pollDataWithOption.pollId,
      );
    }
  };
  useEffect(() => {
    if (!isLoading && addReqResponse) {
      if (addReqResponse.status) {
        dispatch(
          addUserNotification({
            message: t('polls.response-added'),
            typeOption: 'info',
          }),
        );
      } else {
        dispatch(
          addUserNotification({
            message: t(addReqResponse.msg),
            typeOption: 'error',
          }),
        );
      }
      setLocked(false);
    }
  }, [addReqResponse, dispatch, isLoading, t]);

  const onClickSelectOption = useCallback(
    (val: number) => {
      if (voted || !isRunning) {
        return;
      }
      setSelectedOption(val);
    },
    [voted, isRunning],
  );

  const canViewPercentage = () => {
    if (!isRunning) {
      return true;
    }
    return !!currentUser?.metadata?.isAdmin;
  };

  const pollOption = useMemo(() => {
    const elms: Array<ReactElement> = [];
    for (const key in pollDataWithOption.options) {
      const o = pollDataWithOption.options[key];
      elms.push(
        <div
          key={`option-${pollDataWithOption.pollId}-${o.id}`}
          className="relative flex items-center border border-Gray-300 min-h-[38px] bg-white shadow-buttonShadow rounded-xl px-2 overflow-hidden my-2"
          onClick={() => onClickSelectOption(o.id)}
        >
          <input
            type="radio"
            id={`option-${pollDataWithOption.pollId}-${o.id}`}
            readOnly={true}
            checked={selectedOption === o.id}
            className="polls-checkbox relative appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-buttonShadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600"
          />
          <label
            className="text-sm text-Gray-900 absolute w-full h-full pl-7 z-10 flex items-center cursor-pointer"
            htmlFor={`option-${pollDataWithOption.pollId}-${o.id}`}
          >
            {o.text}
          </label>
          {canViewPercentage() ? (
            <>
              <div
                className="shape absolute top-0 left-0 h-full bg-[rgba(0,161,242,0.2)]"
                style={{ width: o.responsesPercentage + '%' }}
              ></div>
              <div className="per absolute top-1/2 -translate-y-1/2 right-4 text-xs text-Gray-700">
                {o.responsesPercentage + '%'}
              </div>
            </>
          ) : null}
        </div>,
      );
    }
    return elms;
    //eslint-disable-next-line
  }, [onClickSelectOption, pollDataWithOption.options, selectedOption]);

  return (
    <form
      className="group"
      onSubmit={onSubmit}
      name={`voteForm-${pollDataWithOption.pollId}`}
    >
      {pollOption}
      {isLoading ? (
        <div className="loading absolute text-center top-1/2 -translate-y-1/2 z-[999] left-0 right-0 m-auto">
          <div className="lds-ripple">
            <div className="border-secondaryColor" />
            <div className="border-secondaryColor" />
          </div>
        </div>
      ) : null}
      {!isRunning || voted || !selectedOption ? null : (
        <div className="button-section flex items-center justify-end mt-3">
          <button
            className="h-8 px-5 flex items-center justify-center rounded-[10px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue border border-DarkBlue transition-all duration-300 hover:bg-DarkBlue shadow-buttonShadow"
            type="submit"
          >
            {t('polls.submit')}
          </button>
        </div>
      )}
    </form>
  );
};

export default PollForm;
