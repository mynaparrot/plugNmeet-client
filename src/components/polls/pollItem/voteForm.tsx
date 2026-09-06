import React, {
  ReactElement,
  SubmitEvent,
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
import { LoadingIcon } from '../../../assets/Icons/Loading';
import { CheckMarkIconSVG } from '../../../assets/Icons/CheckMarkIconSVG';

// formatCountdown renders remaining seconds as mm:ss for the expiry countdown
const formatCountdown = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

interface PollFormProps {
  pollDataWithOption: PollDataWithOption;
  isRunning: boolean;
}

const PollForm = ({ pollDataWithOption, isRunning }: PollFormProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(
    new Set(),
  );
  const conn = getNatsConn();
  const currentUser = useMemo(() => store.getState().session.currentUser, []);

  // expiry countdown for fixed-duration polls (expiresAt 0 = no limit)
  const expiresAt = pollDataWithOption.expiresAt ?? 0;
  const [remaining, setRemaining] = useState<number>(() =>
    expiresAt > 0 ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : 0,
  );
  // tick once per second; interval is cleaned up on unmount
  useEffect(() => {
    if (!isRunning || expiresAt <= 0) {
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, expiresAt]);
  // locally treat an expired poll as closed; the server's POLL_CLOSED confirms
  const locallyClosed = isRunning && expiresAt > 0 && remaining <= 0;

  const [voted, setVoted] = useState<boolean>(false);
  const { data: userVoteData } = useGetUserSelectedOptionQuery({
    pollId: pollDataWithOption.pollId,
    userId: currentUser?.userId || '',
  });
  useEffect(() => {
    if (!userVoteData || !userVoteData.status) {
      return;
    }
    // has_voted is the authoritative flag; it also covers anonymous polls
    if (userVoteData.hasVoted) {
      setVoted(true);
    }
    // previous selections can only be shown for non-anonymous polls
    if (
      !pollDataWithOption.isAnonymous &&
      userVoteData.voted &&
      userVoteData.voted.length > 0
    ) {
      setSelectedOptions(new Set(userVoteData.voted.map(Number)));
    }
  }, [userVoteData, pollDataWithOption.isAnonymous]);

  const [addResponse, { isLoading, data: addReqResponse }] =
    useAddResponseMutation();

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedOptions.size === 0 || isLoading) {
      return;
    }
    addResponse(
      create(SubmitPollResponseReqSchema, {
        pollId: pollDataWithOption.pollId,
        userId: currentUser?.userId ?? '',
        name: currentUser?.name ?? '',
        // repeated selected_options: single choice wraps its one pick
        selectedOptions: Array.from(selectedOptions, String),
      }),
    );

    // notify to everyone; payload is the poll id (caches are invalidated on receipt)
    if (conn) {
      conn.sendDataMessage(
        DataMsgBodyType.NEW_POLL_RESPONSE,
        pollDataWithOption.pollId,
      );
    }
  };

  useEffect(() => {
    if (addReqResponse) {
      const message = addReqResponse.status
        ? t('polls.notifications.response-added')
        : t(addReqResponse.msg);
      const typeOption = addReqResponse.status ? 'info' : 'error';

      dispatch(
        addUserNotification({
          message,
          typeOption,
        }),
      );
    }
    // We only want this to run when the response comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addReqResponse]);

  const onClickSelectOption = useCallback(
    (val: number) => {
      if (voted || !isRunning || locallyClosed) {
        return;
      }
      setSelectedOptions((prev) => {
        const next = new Set(prev);
        if (pollDataWithOption.isMultiple) {
          // multi-select: toggle the option in place
          if (next.has(val)) {
            next.delete(val);
          } else {
            next.add(val);
          }
        } else {
          // single choice: keep only the latest option
          next.clear();
          next.add(val);
        }
        return next;
      });
    },
    [isRunning, voted, locallyClosed, pollDataWithOption.isMultiple],
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
      // correct answers are revealed only once a closed quiz poll shows results
      const showCorrect =
        pollDataWithOption.isQuiz && !isRunning && o.isCorrect;
      // Determine bar color based on percentage
      let barColor = 'rgba(0, 161, 242, 0.1)'; // default light blue
      if (o.responsesPercentage >= 50) {
        barColor = 'rgba(0, 161, 242, 0.2)'; // green for high percentages
      }
      elms.push(
        // Keyboard users interact with the nested radio input/label below, which
        // already emits the click this wrapper listens for.
        // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          key={`option-${pollDataWithOption.pollId}-${o.id}`}
          className={`relative flex items-center border ${showCorrect ? 'border-Green-700 dark:border-Green-700' : 'border-Gray-300 dark:border-Gray-600'} min-h-[38px] bg-white dark:bg-dark-secondary shadow-button-shadow dark:shadow-none rounded-xl px-2 overflow-hidden my-2 cursor-pointer`}
          onClick={() => onClickSelectOption(o.id)}
        >
          <input
            type={pollDataWithOption.isMultiple ? 'checkbox' : 'radio'}
            id={`option-${pollDataWithOption.pollId}-${o.id}`}
            checked={selectedOptions.has(o.id)}
            readOnly
            className="polls-checkbox relative shrink-0 appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-button-shadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600"
          />
          <label
            className="text-sm text-Gray-900 dark:text-white min-w-0 flex-1 ps-7 z-10 break-words cursor-pointer"
            htmlFor={`option-${pollDataWithOption.pollId}-${o.id}`}
          >
            {o.text}
            {showCorrect && (
              <span className="ms-2 inline-flex items-center align-middle">
                <CheckMarkIconSVG />
              </span>
            )}
          </label>
          {canViewPercentage() && (
            <>
              <div
                className="shape absolute top-0 start-0 h-full bg-[rgba(0,161,242,0.2)]"
                style={{
                  width: `${o.responsesPercentage}%`,
                  backgroundColor: barColor,
                }}
              ></div>
              <div className="per relative z-10 ms-3 pe-2 shrink-0 text-xs text-Gray-700 dark:text-white">
                {o.responsesPercentage + '%'}
              </div>
            </>
          )}
        </div>,
      );
    }
    return elms;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [onClickSelectOption, pollDataWithOption, selectedOptions, isRunning]);

  return (
    <form
      className="group"
      onSubmit={onSubmit}
      name={`voteForm-${pollDataWithOption.pollId}`}
    >
      {pollDataWithOption.isAnonymous && (
        // voter trust: make anonymity visible where the vote happens
        <div className="flex justify-end">
          <span className="border border-Gray-200 dark:border-Gray-700 bg-Gray-50 dark:bg-dark-secondary2 shadow-button-shadow dark:shadow-none rounded-full h-[22px] px-1.5 text-xs text-Gray-700 dark:text-dark-text font-medium flex items-center">
            {t('polls.anonymous')}
          </span>
        </div>
      )}
      {pollOption}
      {isLoading && (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 start-0 end-0 m-auto">
          <LoadingIcon
            className={
              'inline w-10 h-10 me-3 text-Gray-200 dark:text-Gray-800 animate-spin'
            }
            fillColor={'#004D90'}
          />
        </div>
      )}
      {isRunning && !voted && expiresAt > 0 && (
        <div className="time-remaining flex items-center justify-end mt-3">
          <span
            className="border border-Gray-200 dark:border-Gray-700 bg-Gray-50 dark:bg-dark-secondary2 shadow-button-shadow dark:shadow-none rounded-full h-[22px] px-1.5 text-xs text-Gray-700 dark:text-dark-text font-medium flex items-center"
            aria-label={t('polls.time-remaining')}
            title={t('polls.time-remaining')}
            // plain mm:ss digits; keep the colon order stable in RTL layouts
            dir="ltr"
          >
            {formatCountdown(remaining)}
          </span>
        </div>
      )}
      {!isRunning || voted || selectedOptions.size === 0 ? null : (
        <div className="button-section flex items-center justify-end mt-3">
          <button
            className="primary-button h-8 px-5 cursor-pointer flex items-center justify-center rounded-[10px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-white bg-Blue dark:bg-dark-secondary2 border border-DarkBlue dark:border-dark-secondary2 transition-all duration-300 hover:bg-DarkBlue shadow-button-shadow dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={locallyClosed}
          >
            {t('polls.submit')}
          </button>
        </div>
      )}
    </form>
  );
};

export default PollForm;
