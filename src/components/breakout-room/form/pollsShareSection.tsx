import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGetPollListsQuery } from '../../../store/services/pollsApi';

interface IPollsShareSectionProps {
  sharePolls: boolean;
  setSharePolls: (value: boolean) => void;
  sharePollIds: string[];
  setSharePollIds: (ids: string[]) => void;
}

const PollsShareSection = ({
  sharePolls,
  setSharePolls,
  sharePollIds,
  setSharePollIds,
}: IPollsShareSectionProps) => {
  const { t } = useTranslation();
  const { data } = useGetPollListsQuery();
  const polls = data?.polls ?? [];
  const pollCount = polls.length;
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
          onChange={(e) => {
            const checked = e.currentTarget.checked;
            setSharePolls(checked);
            // default to ALL polls selected, preserving the old share-all behavior
            setSharePollIds(checked ? polls.map((p) => p.id) : []);
          }}
        />
      </div>
      <div className="text-base w-full ps-2 sm:ps-4">
        <label
          htmlFor="share-polls"
          className="text-sm 3xl:text-base font-medium text-Gray-950 dark:text-dark-text cursor-pointer"
        >
          {t('breakout-room.share-polls')}
          <p className="text-xs md:text-sm opacity-70 dark:opacity-80">
            {t('breakout-room.share-polls-desc', {
              count: sharePollIds.length,
            })}
          </p>
        </label>
        {sharePolls && polls.length > 0 && (
          <div className="polls-share-list mt-3 flex flex-col gap-2">
            {polls.map((p) => (
              <div className="item flex items-start" key={p.id}>
                <div className="input">
                  <input
                    id={`share-poll-${p.id}`}
                    name={`share-poll-${p.id}`}
                    type="checkbox"
                    className="border cursor-pointer border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus focus-ring mt-1 dark:bg-dark-secondary dark:border-dark-text"
                    checked={sharePollIds.includes(p.id)}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setSharePollIds(
                        checked
                          ? [...sharePollIds, p.id]
                          : sharePollIds.filter((x) => x !== p.id),
                      );
                    }}
                  />
                </div>
                <div className="text-base w-full ps-2 sm:ps-4">
                  <label
                    htmlFor={`share-poll-${p.id}`}
                    className="text-sm 3xl:text-base font-medium text-Gray-950 dark:text-dark-text cursor-pointer"
                  >
                    {p.question}
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PollsShareSection;
