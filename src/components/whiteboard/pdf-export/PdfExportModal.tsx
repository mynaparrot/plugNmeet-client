import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTranslation } from 'react-i18next';

import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';
import usePdfExport from './usePdfExport';
import {
  PdfExportMode,
  PdfPageInfo,
  PdfQuality,
  PDF_MAX_PAGES_WARNING,
} from './types';

interface PdfExportModalProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  roomId?: string;
  currentPage: number;
  totalPages: number;
  fileId?: string;
  isPresenter?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const QUALITY_OPTIONS: PdfQuality[] = ['small', 'normal', 'high'];
const MODE_OPTIONS: PdfExportMode[] = ['current', 'selected', 'all', 'content'];

const PdfExportModal = ({
  excalidrawAPI,
  roomId,
  currentPage,
  totalPages,
  fileId,
  isPresenter,
  isOpen,
  onClose,
}: PdfExportModalProps) => {
  const { t } = useTranslation();
  const [quality, setQuality] = useState<PdfQuality>('normal');
  const [mode, setMode] = useState<PdfExportMode>('current');
  const [pageInfos, setPageInfos] = useState<PdfPageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  const { status, error, progress, exportPages, loadPageInfos, cancel, reset } =
    usePdfExport({
      excalidrawAPI,
      roomId,
      currentPage,
      totalPages,
      fileId,
    });

  // Reset transient state and (re)load the page list whenever the modal opens.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    reset();
    setMode('current');
    setSelectedPages(new Set([currentPage]));
    let cancelled = false;
    loadPageInfos().then((infos) => {
      if (!cancelled) {
        setPageInfos(infos);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentPage, loadPageInfos, reset]);

  // Close the modal once an export completes successfully. The success and
  // error toasts are fired imperatively inside the export hook so each export
  // shows exactly one notification, regardless of re-renders or React Strict
  // Mode's double-invoked effects.
  useEffect(() => {
    if (status === 'done') {
      onClose();
    }
  }, [status, onClose]);

  const isExporting = status === 'exporting';

  const contentPages = useMemo(
    () => pageInfos.filter((p) => p.hasContent).map((p) => p.page),
    [pageInfos],
  );

  const contentPageSet = useMemo(() => new Set(contentPages), [contentPages]);

  // Number of empty pages that will be included as blank pages for the chosen
  // mode. Only "all" and "selected" include blanks; the other modes never do.
  const blankPageCount = useMemo(() => {
    if (mode === 'all') {
      return Math.max(totalPages - contentPages.length, 0);
    }
    if (mode === 'selected') {
      return Array.from(selectedPages).filter((p) => !contentPageSet.has(p))
        .length;
    }
    return 0;
  }, [mode, totalPages, contentPages, selectedPages, contentPageSet]);

  // Number of pages that will actually be exported for the chosen mode.
  const targetCount = useMemo(() => {
    switch (mode) {
      case 'current':
        return 1;
      case 'selected':
        return selectedPages.size;
      case 'all':
        return totalPages;
      case 'content':
        return contentPages.length;
      default:
        return 0;
    }
  }, [mode, selectedPages, totalPages, contentPages]);

  const togglePage = useCallback((page: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPages(new Set(pageInfos.map((p) => p.page)));
  }, [pageInfos]);

  const clearSelection = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const handleExport = useCallback(() => {
    exportPages({
      mode,
      quality,
      selectedPages: Array.from(selectedPages),
    });
  }, [exportPages, mode, quality, selectedPages]);

  const overLimit = targetCount > PDF_MAX_PAGES_WARNING;
  const canExport = targetCount > 0 && !isExporting;
  // Non-presenters only have pages they personally visited stored locally, so a
  // multi-page export may silently omit pages drawn by the presenter.
  const showIncompleteWarning =
    isPresenter === false && mode !== 'current' && totalPages > 1;

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-10 focus:outline-hidden"
      onClose={() => false}
    >
      <div className="excalidrawExportPdf fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70 dark:bg-Gray-950/80">
        <div className="flex min-h-full items-center justify-center py-4">
          <DialogPanel
            transition
            className="w-full max-w-md bg-white dark:bg-dark-primary border border-Gray-200 dark:border-Gray-800 shadow-virtual-pOP rounded-xl overflow-hidden duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
          >
            <DialogTitle
              as="h3"
              className="flex items-center justify-between text-base font-semibold leading-7 text-Gray-950 dark:text-white px-4 py-2 border-b border-Gray-100 dark:border-Gray-800"
            >
              {t('whiteboard.export-pdf-title')}
              <Button
                className="cursor-pointer"
                onClick={() => onClose()}
                disabled={isExporting}
              >
                <PopupCloseSVGIcon classes="text-Gray-600 dark:text-white" />
              </Button>
            </DialogTitle>
            <div className="wrap p-4 bg-Gray-25 dark:bg-dark-primary max-h-[70vh] overflow-y-auto">
              {/* Export mode */}
              <div className="mode-wrap pb-3">
                <p className="text-sm font-medium text-Gray-950 dark:text-white pb-2">
                  {t('whiteboard.export-pdf-mode')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MODE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setMode(m)}
                      className={`h-9 w-full rounded-xl text-sm font-medium border transition-all duration-300 cursor-pointer ${
                        mode === m
                          ? 'text-white bg-Blue2-500 border-Blue2-600'
                          : 'text-Gray-950 dark:text-white bg-Gray-25 dark:bg-dark-secondary2 border-Gray-300 dark:border-Gray-700'
                      }`}
                    >
                      {t(`whiteboard.export-pdf-mode-${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page selection (only for the "selected" mode) */}
              {mode === 'selected' && (
                <div className="pages-wrap pb-3">
                  <div className="flex items-center justify-between pb-2">
                    <p className="text-sm font-medium text-Gray-950 dark:text-white">
                      {t('whiteboard.export-pdf-pages')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={selectAll}
                        className="text-xs text-Blue2-500 hover:underline cursor-pointer"
                      >
                        {t('whiteboard.export-pdf-select-all')}
                      </button>
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={clearSelection}
                        className="text-xs text-Gray-600 dark:text-dark-text hover:underline cursor-pointer"
                      >
                        {t('whiteboard.export-pdf-clear')}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {pageInfos.map((info) => {
                      const checked = selectedPages.has(info.page);
                      return (
                        <button
                          key={info.page}
                          type="button"
                          disabled={isExporting}
                          onClick={() => togglePage(info.page)}
                          title={
                            info.hasContent
                              ? t('whiteboard.export-pdf-has-content')
                              : t('whiteboard.export-pdf-no-content')
                          }
                          className={`relative h-9 w-full rounded-lg text-sm font-medium border transition-all duration-300 cursor-pointer ${
                            checked
                              ? 'text-white bg-Blue2-500 border-Blue2-600'
                              : 'text-Gray-950 dark:text-white bg-Gray-25 dark:bg-dark-secondary2 border-Gray-300 dark:border-Gray-700'
                          }`}
                        >
                          {info.page}
                          {info.hasContent && (
                            <span
                              className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
                                checked ? 'bg-white' : 'bg-green-500'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-Gray-500 dark:text-dark-text pt-2">
                    {t('whiteboard.export-pdf-content-hint')}
                  </p>
                </div>
              )}

              {/* Quality */}
              <div className="quality-wrap">
                <p className="text-sm font-medium text-Gray-950 dark:text-white pb-2">
                  {t('whiteboard.export-pdf-quality')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setQuality(q)}
                      className={`h-9 w-full rounded-xl text-sm font-medium border transition-all duration-300 cursor-pointer ${
                        quality === q
                          ? 'text-white bg-Blue2-500 border-Blue2-600'
                          : 'text-Gray-950 dark:text-white bg-Gray-25 dark:bg-dark-secondary2 border-Gray-300 dark:border-Gray-700'
                      }`}
                    >
                      {t(`whiteboard.quality-${q}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {showIncompleteWarning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 pt-3">
                  {t('whiteboard.export-pdf-incomplete-warning')}
                </p>
              )}
              {blankPageCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 pt-3">
                  {t('whiteboard.export-pdf-blank-pages-warning', {
                    count: blankPageCount,
                  })}
                </p>
              )}
              {overLimit && (
                <p className="text-xs text-amber-600 dark:text-amber-400 pt-3">
                  {t('whiteboard.export-pdf-max-pages-warning', {
                    count: PDF_MAX_PAGES_WARNING,
                  })}
                </p>
              )}

              {/* Progress */}
              {isExporting && progress && (
                <div className="progress-wrap pt-4">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-Gray-700 dark:text-dark-text">
                      {t('whiteboard.export-pdf-progress', {
                        current: Math.min(progress.current + 1, progress.total),
                        total: progress.total,
                      })}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-Gray-200 dark:bg-Gray-800 overflow-hidden">
                    <div
                      className="h-full bg-Blue2-500 transition-all duration-200"
                      style={{
                        width: `${
                          progress.total
                            ? (progress.current / progress.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && !isExporting && (
                <p className="text-sm text-red-500 pt-3">
                  {error === 'empty-page'
                    ? t('whiteboard.export-pdf-empty')
                    : t('whiteboard.export-pdf-error')}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-Gray-100 dark:border-Gray-800">
              {isExporting ? (
                <button
                  className="secondary-button h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow cursor-pointer col-span-2"
                  onClick={() => cancel()}
                >
                  {t('whiteboard.export-pdf-cancel')}
                </button>
              ) : (
                <>
                  <button
                    className="secondary-button h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow cursor-pointer"
                    onClick={() => onClose()}
                  >
                    {t('close')}
                  </button>
                  <button
                    className="primary-button h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-white bg-Blue2-500 border border-Blue2-600 transition-all duration-300 hover:bg-Blue2-600 shadow-button-shadow cursor-pointer disabled:opacity-60"
                    onClick={handleExport}
                    disabled={!canExport}
                  >
                    {targetCount > 1
                      ? t('whiteboard.export-pdf-download-count', {
                          count: targetCount,
                        })
                      : t('whiteboard.export-pdf-download')}
                  </button>
                </>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default React.memo(PdfExportModal);
