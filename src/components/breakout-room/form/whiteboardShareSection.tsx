import React from 'react';
import { useTranslation } from 'react-i18next';

interface IWhiteboardShareSectionProps {
  hasWhiteboardFile: boolean;
  shareWhiteboard: boolean;
  setShareWhiteboard: (value: boolean) => void;
  selectedWhiteboardPages: number[];
  setSelectedWhiteboardPages: (pages: number[]) => void;
  toggleWhiteboardPage: (page: number) => void;
  allWhiteboardPages: number[];
  whiteboardTotalPages: number;
  disabled: boolean;
}

const WhiteboardShareSection = ({
  hasWhiteboardFile,
  shareWhiteboard,
  setShareWhiteboard,
  selectedWhiteboardPages,
  setSelectedWhiteboardPages,
  toggleWhiteboardPage,
  allWhiteboardPages,
  whiteboardTotalPages,
  disabled,
}: IWhiteboardShareSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="breakout-whiteboard-share mt-4">
      <div className="item flex items-start">
        <div className="input">
          <input
            id="share-whiteboard"
            name="share-whiteboard"
            type="checkbox"
            className="border cursor-pointer border-Gray-300 bg-white shadow-input w-5 h-5 outline-hidden focus:border-[rgba(0,161,242,1)] focus:shadow-input-focus focus-ring mt-1 dark:bg-dark-secondary dark:border-dark-text"
            checked={shareWhiteboard}
            disabled={disabled || !hasWhiteboardFile}
            onChange={(e) => setShareWhiteboard(e.currentTarget.checked)}
          />
        </div>
        <div className="text-base w-full ps-2 sm:ps-4">
          <label
            htmlFor="share-whiteboard"
            className="text-sm 3xl:text-base font-medium text-Gray-950 dark:text-dark-text cursor-pointer"
          >
            {t('breakout-room.share-whiteboard-label')}
            <p className="text-xs md:text-sm opacity-70 dark:opacity-80">
              {disabled
                ? t('breakout-room.share-unavailable-e2ee')
                : hasWhiteboardFile
                  ? t('breakout-room.share-whiteboard-description')
                  : t('breakout-room.share-whiteboard-no-file')}
            </p>
          </label>
        </div>
      </div>

      {shareWhiteboard && hasWhiteboardFile && (
        <div className="mt-3 ps-7">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <button
              type="button"
              className="text-sm font-medium text-Blue hover:underline cursor-pointer"
              onClick={() =>
                setSelectedWhiteboardPages([...allWhiteboardPages])
              }
            >
              {t('breakout-room.share-whiteboard-select-all')}
            </button>
            <button
              type="button"
              className="text-sm font-medium text-Blue hover:underline cursor-pointer"
              onClick={() => setSelectedWhiteboardPages([])}
            >
              {t('breakout-room.share-whiteboard-deselect-all')}
            </button>
            <span className="text-sm text-Gray-800 dark:text-white">
              {t('breakout-room.share-whiteboard-page-summary', {
                selected: selectedWhiteboardPages.length,
                total: whiteboardTotalPages,
              })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allWhiteboardPages.map((page) => (
              <label
                key={page}
                className="flex items-center gap-1 text-sm text-Gray-800 dark:text-white cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="border cursor-pointer border-Gray-300 bg-white shadow-input w-4 h-4 outline-hidden focus:border-[rgba(0,161,242,1)] dark:bg-dark-secondary dark:border-dark-text"
                  checked={selectedWhiteboardPages.includes(page)}
                  onChange={() => toggleWhiteboardPage(page)}
                />
                {page}
              </label>
            ))}
          </div>
          {selectedWhiteboardPages.length === 0 && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {t('breakout-room.share-whiteboard-no-pages')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WhiteboardShareSection;
