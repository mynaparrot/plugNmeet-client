import React, { useCallback, useRef, useState } from 'react';
import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useTranslation } from 'react-i18next';

import { PopupCloseSVGIcon } from '../../../assets/Icons/PopupCloseSVGIcon';
import { sleep } from '../../../helpers/utils';
import { updateCurrentWhiteboardOfficeFileId } from '../../../store/slices/whiteboard';
import { store, useAppDispatch } from '../../../store';
import FileUploadProgress from './fileUploadProgress';
import UploadedFilesList from './uploadedFilesList';
import { IWhiteboardOfficeFile } from '../../../store/slices/interfaces/whiteboard';
import { broadcastWhiteboardOfficeFile } from '../helpers/handleRequestedWhiteboardData';
import { formatStorageKey } from '../helpers/utils';

interface ManageOfficeFilesModalProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  isOpen: boolean;
  onClose: () => void;
}

const ManageOfficeFilesModal = ({
  excalidrawAPI,
  isOpen,
  onClose,
}: ManageOfficeFilesModalProps) => {
  // prettier-ignore
  const allowedFileTypes: string[] = ['pdf', 'docx', 'doc', 'odt', 'txt', 'rtf', 'xml', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp', 'vsd', 'odg', 'html'];
  const maxAllowedFileSize =
    store.getState().session.currentRoom.metadata?.roomFeatures
      ?.whiteboardFeatures?.maxAllowedFileSize;

  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const inputFile = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [selectedOfficeFile, setOnSelectOfficeFile] = useState<
    IWhiteboardOfficeFile | undefined
  >(undefined);
  const [disableUploading, setDisableUploading] = useState<boolean>(false);

  const switchOfficeFile = async (f: IWhiteboardOfficeFile) => {
    await saveCurrentPageData();
    dispatch(updateCurrentWhiteboardOfficeFileId(f.fileId));
    await sleep(500);
    await broadcastWhiteboardOfficeFile(f);
  };

  const saveCurrentPageData = async () => {
    if (!excalidrawAPI) {
      return;
    }
    const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
    if (elms.length) {
      const currentPageNumber = store.getState().whiteboard.currentPage;
      sessionStorage.setItem(
        formatStorageKey(currentPageNumber),
        JSON.stringify(elms),
      );
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length) {
      setSelectedFile(selectedFiles[0]);
    }
  };

  const addToWhiteboard = useCallback(() => {
    if (selectedOfficeFile) {
      switchOfficeFile(selectedOfficeFile).then();
      onClose();
    }
    //oxlint-disable-next-line
  }, [selectedOfficeFile]);

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-10 focus:outline-hidden"
      unmount={false}
      onClose={() => false}
    >
      <div className="excalidrawUploadFiles fixed inset-0 w-screen overflow-y-auto z-10 bg-Gray-950/70">
        <div className="flex min-h-full items-center justify-center py-4">
          <DialogPanel
            transition
            className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtual-pOP rounded-xl overflow-hidden duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
          >
            <DialogTitle
              as="h3"
              className="flex items-center justify-between text-base font-semibold leading-7 text-Gray-950 px-4 py-2 border-b border-Gray-100"
            >
              <span>{t('whiteboard.upload-files-title')}</span>
              <Button className="cursor-pointer" onClick={() => onClose()}>
                <PopupCloseSVGIcon classes="text-Gray-600" />
              </Button>
            </DialogTitle>
            <div className="wrap p-4 bg-Gray-25">
              <div className="input-wrap relative rounded-xl border border-dashed border-Gray-200 py-8 px-6 cursor-pointer">
                <input
                  type="file"
                  multiple={false}
                  disabled={disableUploading}
                  ref={inputFile}
                  onChange={onChange}
                  accept={allowedFileTypes.join(',')}
                  className="w-full h-full absolute top-0 left-0 opacity-0 cursor-pointer"
                />
                <div className="text-wrap text-sm font-medium text-center cursor-pointer">
                  <p className="text-Gray-950 font-semibold pb-1">
                    {t('whiteboard.drag-drop-file')}
                  </p>
                  <p className="text-Gray-700">
                    {t('whiteboard.max-file-size', {
                      size: maxAllowedFileSize,
                    })}
                  </p>
                  <div className="divider flex justify-center items-center gap-3 py-3">
                    <span className="line inline-block h-[1px] w-20 bg-Gray-200"></span>
                    <span className="text-Gray-600">{t('whiteboard.or')}</span>
                    <span className="line inline-block h-[1px] w-20 bg-Gray-200"></span>
                  </div>
                  <button className="h-9 w-auto m-auto px-4 flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow cursor-pointer">
                    <i className="pnm-attachment text-[14px] ltr:mr-1 rtl:ml-1" />
                    {t('whiteboard.select-file')}
                  </button>
                </div>
              </div>
              <div className="file-preview-list grid gap-2 pt-4">
                {selectedFile && (
                  <FileUploadProgress
                    key={selectedFile.name + selectedFile.lastModified}
                    excalidrawAPI={excalidrawAPI}
                    allowedFileTypes={allowedFileTypes}
                    file={selectedFile}
                    setDisableUploading={setDisableUploading}
                  />
                )}
                <UploadedFilesList
                  onSelectOfficeFile={setOnSelectOfficeFile}
                  selectedFileId={selectedOfficeFile?.fileId}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-Gray-100">
              <button
                className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow cursor-pointer"
                onClick={() => onClose()}
              >
                {t('close')}
              </button>
              <button
                className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-white bg-Blue2-500 border border-Blue2-600 transition-all duration-300 hover:bg-Blue2-600  shadow-button-shadow cursor-pointer"
                onClick={addToWhiteboard}
                disabled={selectedOfficeFile === undefined || disableUploading}
              >
                {t('whiteboard.add-to-whiteboard')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default ManageOfficeFilesModal;
