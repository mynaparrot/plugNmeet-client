import React from 'react';
import { useTranslation } from 'react-i18next';

interface INotepadShareSectionProps {
  shareNotepad: boolean;
  setShareNotepad: (value: boolean) => void;
  disabled: boolean;
}

const NotepadShareSection = ({
  shareNotepad,
  setShareNotepad,
  disabled,
}: INotepadShareSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="item flex items-start mt-4">
      <div className="input">
        <input
          id="share-notepad"
          name="share-notepad"
          type="checkbox"
          className="border cursor-pointer border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus focus-ring mt-1 dark:bg-dark-secondary dark:border-dark-text"
          checked={shareNotepad}
          disabled={disabled}
          onChange={(e) => setShareNotepad(e.currentTarget.checked)}
        />
      </div>
      <div className="text-base w-full ps-2 sm:ps-4">
        <label
          htmlFor="share-notepad"
          className="text-sm 3xl:text-base font-medium text-Gray-950 dark:text-dark-text cursor-pointer"
        >
          {t('breakout-room.share-notepad-label')}
          <p className="text-xs md:text-sm opacity-70 dark:opacity-80">
            {disabled
              ? t('breakout-room.share-unavailable-e2ee')
              : t('breakout-room.share-notepad-description')}
          </p>
        </label>
      </div>
    </div>
  );
};

export default NotepadShareSection;
