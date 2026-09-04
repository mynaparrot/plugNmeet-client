import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGetPollListsQuery } from '../../../store/services/pollsApi';

interface IPollsShareSectionProps {
  sharePolls: boolean;
  setSharePolls: (value: boolean) => void;
}

const PollsShareSection = ({
  sharePolls,
  setSharePolls,
}: IPollsShareSectionProps) => {
  const { t } = useTranslation();
  const { data } = useGetPollListsQuery();
  const pollCount = data?.polls?.length ?? 0;
  const disabled = pollCount === 0;

  return (
    <div className="item flex items-start mt-4">
      <div className="input">
        <input
          id="share-polls"
          name="share-polls"
          type="checkbox"
          className="border cursor-pointer border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus focus-ring mt-1 dark:bg-dark-secondary dark:border-dark-text"
          checked={sharePolls}
          disabled={disabled}
          onChange={(e) => setSharePolls(e.currentTarget.checked)}
        />
      </div>
      <div className="text-base w-full ps-2 sm:ps-4">
        <label
          htmlFor="share-polls"
          className="text-sm 3xl:text-base font-medium text-Gray-950 dark:text-dark-text cursor-pointer"
        >
          {t('breakout-room.share-polls')}
          <p className="text-xs md:text-sm opacity-70 dark:opacity-80">
            {t('breakout-room.share-polls-desc', { count: pollCount })}
          </p>
        </label>
      </div>
    </div>
  );
};

export default PollsShareSection;
