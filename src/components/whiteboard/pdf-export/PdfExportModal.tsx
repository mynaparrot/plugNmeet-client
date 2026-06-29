import React, { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';
import usePdfExport from './usePdfExport';
import { PdfQuality } from './types';

interface PdfExportModalProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  roomId?: string;
  currentPage: number;
  isOpen: boolean;
  onClose: () => void;
}

const QUALITY_OPTIONS: PdfQuality[] = ['small', 'normal', 'high'];

const PdfExportModal = ({
  excalidrawAPI,
  roomId,
  currentPage,
  isOpen,
  onClose,
}: PdfExportModalProps) => {
  const { t } = useTranslation();
  const [quality, setQuality] = useState<PdfQuality>('normal');
  const { status, error, exportCurrentPage, reset } = usePdfExport({
    excalidrawAPI,
    roomId,
    currentPage,
  });

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (status === 'done') {
      toast(t('whiteboard.export-pdf-success'), { type: 'success' });
      onClose();
    } else if (status === 'error') {
      toast(t('whiteboard.export-pdf-error'), { type: 'error' });
    }
  }, [status, t, onClose]);

  const isExporting = status === 'exporting';

  const handleExport = useCallback(() => {
    exportCurrentPage(quality);
  }, [exportCurrentPage, quality]);

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
              <Button className="cursor-pointer" onClick={() => onClose()}>
                <PopupCloseSVGIcon classes="text-Gray-600 dark:text-white" />
              </Button>
            </DialogTitle>
            <div className="wrap p-4 bg-Gray-25 dark:bg-dark-primary">
              <p className="text-sm text-Gray-700 dark:text-dark-text pb-3">
                {t('whiteboard.export-pdf-current-page')}
              </p>
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
              {error && (
                <p className="text-sm text-red-500 pt-3">
                  {t('whiteboard.export-pdf-error')}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-Gray-100 dark:border-Gray-800">
              <button
                className="secondary-button h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow cursor-pointer"
                onClick={() => onClose()}
                disabled={isExporting}
              >
                {t('close')}
              </button>
              <button
                className="primary-button h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-white bg-Blue2-500 border border-Blue2-600 transition-all duration-300 hover:bg-Blue2-600 shadow-button-shadow cursor-pointer disabled:opacity-60"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting
                  ? t('whiteboard.export-pdf-exporting')
                  : t('whiteboard.export-pdf-download')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default React.memo(PdfExportModal);
