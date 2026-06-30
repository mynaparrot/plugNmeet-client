import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { toast } from 'react-toastify';

import Modal from '../../../helpers/ui/modal';
import { useAppSelector } from '../../../store';
import { exportPdfService } from './ExportPdfService';
import { DB_STORE_NAMES, idbGetAllKeys } from '../../../helpers/libs/idb';
import { getStorageKeyPageNumberRegex } from '../helpers/utils';

type ExportMode = 'all' | 'current' | 'selected';

interface ExportPDFModalProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  onClose: () => void;
  isOpen: boolean;
}

const ExportPDFModal = ({
  excalidrawAPI,
  onClose,
  isOpen,
}: ExportPDFModalProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ExportMode>('all');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  const fileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );
  const officeFiles = useAppSelector(
    (state) => state.whiteboard.whiteboardUploadedOfficeFiles,
  );

  const fileName = useMemo(() => {
    const officeFile = officeFiles.find((f) => f.fileId === fileId);
    return officeFile?.fileName ?? 'whiteboard';
  }, [officeFiles, fileId]);

  useEffect(() => {
    const fetchAvailablePages = async () => {
      if (!isOpen) return;
      const keys = await idbGetAllKeys(DB_STORE_NAMES.WHITEBOARD);
      const regex = getStorageKeyPageNumberRegex(fileId);
      const pageNumbers = keys
        .map((key) => {
          const match = (key as string).match(regex);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((p): p is number => p !== null)
        .sort((a, b) => a - b);
      setAvailablePages(pageNumbers);
    };

    fetchAvailablePages();
  }, [isOpen, fileId]);

  const handleExport = async () => {
    let pagesToExport: number[] = [];
    switch (mode) {
      case 'all':
        pagesToExport = availablePages;
        break;
      case 'current':
        if (availablePages.includes(currentPage)) {
          pagesToExport = [currentPage];
        } else {
          toast.warn(t('whiteboard.export-pdf-no-content-on-current-page'));
          return;
        }
        break;
      case 'selected':
        if (selectedPages.size === 0) {
          toast.warn(t('whiteboard.export-pdf-no-pages-selected'));
          return;
        }
        pagesToExport = Array.from(selectedPages).sort((a, b) => a - b);
        break;
    }

    if (pagesToExport.length === 0) {
      toast.warn(t('whiteboard.export-pdf-no-pages-to-export'));
      return;
    }

    setIsExporting(true);
    await exportPdfService.export({
      fileId,
      fileName,
      pages: pagesToExport,
      excalidrawAPI,
    });
    setIsExporting(false);
    onClose();
  };

  const togglePage = (page: number) => {
    setSelectedPages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(page)) {
        newSet.delete(page);
      } else {
        newSet.add(page);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(availablePages));
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const { canExport, targetCount } = useMemo(() => {
    if (availablePages.length === 0) {
      return { canExport: false, targetCount: 0 };
    }
    switch (mode) {
      case 'all':
        return {
          canExport: availablePages.length > 0,
          targetCount: availablePages.length,
        };
      case 'current':
        return {
          canExport: availablePages.includes(currentPage),
          targetCount: 1,
        };
      case 'selected':
        return {
          canExport: selectedPages.size > 0,
          targetCount: selectedPages.size,
        };
      default:
        return { canExport: false, targetCount: 0 };
    }
  }, [mode, availablePages, selectedPages, currentPage]);

  const renderModalContent = () => {
    if (availablePages.length === 0) {
      return (
        <div className="p-4">
          <p className="text-center text-gray-600 dark:text-gray-300">
            {t('whiteboard.export-pdf-no-pages-with-content')}
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="p-3 mb-4 rounded-md bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('whiteboard.export-pdf-pages-info')}
          </p>
        </div>
        <div className="wrap p-4 bg-Gray-25 dark:bg-dark-primary max-h-[70vh] overflow-y-auto">
          {/* Export mode */}
          <div className="mode-wrap pb-3">
            <p className="text-sm font-medium text-Gray-950 dark:text-white pb-2">
              {t('whiteboard.export-pdf-mode')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setMode('all')}
                className={`h-9 w-full rounded-xl text-sm font-medium border transition-all duration-300 cursor-pointer ${
                  mode === 'all'
                    ? 'text-white bg-Blue2-500 border-Blue2-600'
                    : 'text-Gray-950 dark:text-white bg-Gray-25 dark:bg-dark-secondary2 border-Gray-300 dark:border-Gray-700'
                }`}
              >
                {t('whiteboard.export-pdf-all-pages', {
                  count: availablePages.length,
                })}
              </button>
              <button
                type="button"
                disabled={isExporting || !availablePages.includes(currentPage)}
                onClick={() => setMode('current')}
                className={`h-9 w-full rounded-xl text-sm font-medium border transition-all duration-300 cursor-pointer ${
                  mode === 'current'
                    ? 'text-white bg-Blue2-500 border-Blue2-600'
                    : 'text-Gray-950 dark:text-white bg-Gray-25 dark:bg-dark-secondary2 border-Gray-300 dark:border-Gray-700'
                }`}
              >
                {t('whiteboard.export-pdf-current-page', {
                  page: currentPage,
                })}
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setMode('selected')}
                className={`h-9 w-full rounded-xl text-sm font-medium border transition-all duration-300 cursor-pointer ${
                  mode === 'selected'
                    ? 'text-white bg-Blue2-500 border-Blue2-600'
                    : 'text-Gray-950 dark:text-white bg-Gray-25 dark:bg-dark-secondary2 border-Gray-300 dark:border-Gray-700'
                }`}
              >
                {t('whiteboard.export-pdf-selected-pages-count', {
                  count: selectedPages.size,
                })}
              </button>
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
              <div className="grid grid-cols-5 gap-2 max-h-57 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                {availablePages.map((page) => {
                  const checked = selectedPages.has(page);
                  return (
                    <button
                      key={page}
                      type="button"
                      disabled={isExporting}
                      onClick={() => togglePage(page)}
                      className={`relative h-9 w-full rounded-lg text-sm font-medium border transition-all duration-300 cursor-pointer ${
                        checked
                          ? 'text-white bg-Blue2-500 border-Blue2-600'
                          : 'text-Gray-950 dark:text-white bg-Gray-25 dark:bg-dark-secondary2 border-Gray-300 dark:border-Gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress */}
          {isExporting && (
            <div className="progress-wrap pt-4">
              <div className="h-2 w-full rounded-full bg-Gray-200 dark:bg-Gray-800 overflow-hidden">
                <div className="h-full bg-Blue2-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-Gray-100 dark:border-Gray-800">
          {isExporting ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 col-span-2 text-center">
              {t('whiteboard.export-pdf-exporting')}
            </p>
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
                  ? t('whiteboard.export-pdf-button-count', {
                      count: targetCount,
                    })
                  : t('whiteboard.export-pdf-button')}
              </button>
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      title={t('whiteboard.export-pdf-title')}
      customBodyClass="p-0 w-full"
    >
      {renderModalContent()}
    </Modal>
  );
};

export default ExportPDFModal;
