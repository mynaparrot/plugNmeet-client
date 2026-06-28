import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { toast } from 'react-toastify';

import Modal from '../../../helpers/ui/modal';
import RadioOptions, { IRadioOption } from '../../../helpers/ui/radioOptions';
import ActionButton from '../../../helpers/ui/actionButton';
import { useAppSelector } from '../../../store';
import { exportPdfService } from './ExportPdfService';
import { DB_STORE_NAMES, idbGetAllKeys } from '../../../helpers/libs/idb';
import { getStorageKeyPageNumberRegex } from '../helpers/utils';

type ExportType = 'all' | 'current' | 'selected';

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
  const [exportType, setExportType] = useState<ExportType>('all');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    switch (exportType) {
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
        if (selectedPages.length === 0) {
          toast.warn(t('whiteboard.export-pdf-no-pages-selected'));
          return;
        }
        pagesToExport = selectedPages.sort((a, b) => a - b);
        break;
    }

    if (pagesToExport.length === 0) {
      toast.warn(t('whiteboard.export-pdf-no-pages-to-export'));
      return;
    }

    setIsLoading(true);
    await exportPdfService.export({
      fileId,
      fileName,
      pages: pagesToExport,
      excalidrawAPI,
    });
    setIsLoading(false);
    onClose();
  };

  const renderButtons = () => {
    return (
      availablePages.length > 0 && (
        <ActionButton onClick={handleExport} isLoading={isLoading}>
          {t('whiteboard.export-pdf-button')}
        </ActionButton>
      )
    );
  };

  const options: IRadioOption[] = [
    {
      id: 'all',
      value: 'all',
      label: t('whiteboard.export-pdf-all-pages', {
        count: availablePages.length,
      }),
      disabled: availablePages.length === 0,
    },
    {
      id: 'current',
      value: 'current',
      label: t('whiteboard.export-pdf-current-page', {
        page: t('whiteboard.page', { count: currentPage }),
      }),
      disabled: !availablePages.includes(currentPage),
    },
    {
      id: 'selected',
      value: 'selected',
      label: t('whiteboard.export-pdf-selected-pages'),
      disabled: availablePages.length === 0,
    },
  ];

  const renderPageSelection = () => {
    if (exportType !== 'selected' || availablePages.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
          {t('whiteboard.export-pdf-select-pages-label')}
        </p>
        <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-md">
          {availablePages.map((page) => (
            <div key={page} className="flex items-center">
              <input
                type="checkbox"
                id={`page-${page}`}
                checked={selectedPages.includes(page)}
                onChange={() => {
                  setSelectedPages((prev) =>
                    prev.includes(page)
                      ? prev.filter((p) => p !== page)
                      : [...prev, page],
                  );
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                htmlFor={`page-${page}`}
                className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              >
                {t('whiteboard.page', { count: page })}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      title={t('whiteboard.export-pdf-title')}
      renderButtons={renderButtons}
    >
      <div>
        <div className="p-3 mb-4 rounded-md bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('whiteboard.export-pdf-pages-info')}
          </p>
        </div>

        {availablePages.length > 0 ? (
          <>
            <RadioOptions
              options={options}
              name="export-type"
              checked={exportType}
              onChange={(val: ExportType) => setExportType(val)}
            />
            {renderPageSelection()}
          </>
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-300">
            {t('whiteboard.export-pdf-no-pages-with-content')}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ExportPDFModal;
