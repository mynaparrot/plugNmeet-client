import React, { Dispatch, useCallback, useEffect, useState } from 'react';
import { CreatePollOptions } from 'plugnmeet-protocol-js';
import { useGetUserSelectedOptionQuery } from '../../../store/services/pollsApi';
import { store } from '../../../store';

interface PollOptionsProps {
  pollId: string;
  options: CreatePollOptions[] | undefined;
  selectedOption: number;
  setSelectedOption: Dispatch<React.SetStateAction<number>>;
}

const PollOptions = ({
  pollId,
  options,
  selectedOption,
  setSelectedOption,
}: PollOptionsProps) => {
  const [voted, setVoted] = useState<boolean>(false);
  const { data, isLoading } = useGetUserSelectedOptionQuery({
    pollId,
    userId: store.getState().session.currentUser?.userId || '',
  });

  useEffect(() => {
    if (!isLoading && data) {
      if (data.status && data.voted) {
        setVoted(true);
        setSelectedOption(Number(data.voted));
      }
    }
    //eslint-disable-next-line
  }, [data, isLoading]);

  const onChangeOption = useCallback(
    (val: number) => {
      if (!voted) {
        setSelectedOption(val);
      }
    },
    //eslint-disable-next-line
    [voted],
  );

  return !options
    ? null
    : options.map((o) => {
        return (
          <div
            key={o.id}
            className="relative flex items-center border border-Gray-300 min-h-[38px] bg-white shadow-buttonShadow rounded-xl px-2 overflow-hidden"
          >
            <input
              type="radio"
              id={`option-${o.id}`}
              value={o.id}
              name={`option-${o.id}`}
              checked={selectedOption === o.id}
              onChange={(e) => onChangeOption(Number(e.currentTarget.value))}
              className="polls-checkbox relative appearance-none w-[18px] h-[18px] border border-Gray-300 shadow-buttonShadow rounded-[6px] checked:bg-Blue2-500 checked:border-Blue2-600"
            />
            <label
              className="text-sm text-Gray-900 absolute w-full h-full pl-7 z-10 flex items-center cursor-pointer"
              htmlFor={`option-${o.id}`}
            >
              {o.text}
            </label>
            <div
              className="shape absolute top-0 left-0 h-full bg-[rgba(0,161,242,0.2)]"
              style={{ width: '50%' }}
            ></div>
          </div>
        );
      });
};

export default PollOptions;
