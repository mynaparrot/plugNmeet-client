import { useEffect, useRef } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { toast } from 'react-toastify';

import { store } from '../../../../store';
import { updateCurrentWhiteboardOfficeFileId } from '../../../../store/slices/whiteboard';
import i18n from '../../../../helpers/i18n';
import { sleep } from '../../../../helpers/utils';
import officeFileProcessor from '../../manage-office-files/officeFileProcessor';
import { getWhiteboardController, loadWhiteboardLastPage } from '../../collab';
import { broadcastCurrentFileId } from '../handleRequests';

interface IUseWhiteboardFileDrop {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter: boolean;
}

// Must stay in sync with ManageOfficeFilesModal's allowedFileTypes.
// oxfmt-ignore
const OFFICE_FILE_EXTENSIONS = ['pdf', 'docx', 'doc', 'odt', 'txt', 'rtf', 'xml', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp', 'vsd', 'odg', 'html'];

const getExtension = (fileName: string): string => {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() as string) : '';
};

const switchToFile = async (fileId: string) => {
  if (!store.getState().session.currentUser?.metadata?.isPresenter) {
    return;
  }
  if (store.getState().whiteboard.currentWhiteboardOfficeFileId === fileId) {
    return;
  }
  await getWhiteboardController().saveNow();
  const lastPage = await loadWhiteboardLastPage(fileId);
  const page = lastPage ?? 1;
  await broadcastCurrentFileId(fileId, page);
  await sleep(300);
  store.dispatch(updateCurrentWhiteboardOfficeFileId({ fileId, page }));
};

// Capture-phase listener runs before Excalidraw's onDrop.
// Office files are stopped and routed to the upload -> convert pipeline;
// anything else falls through to Excalidraw (images).
const useWhiteboardFileDrop = ({ excalidrawAPI, isPresenter }: IUseWhiteboardFileDrop) => {
  const dropContainerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ excalidrawAPI, isPresenter });
  stateRef.current = { excalidrawAPI, isPresenter };

  useEffect(() => {
    const container = dropContainerRef.current;
    if (!container) {
      return;
    }

    const handleDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) {
        return;
      }
      if (e.target instanceof HTMLElement && e.target.closest('.excalidrawUploadFiles')) {
        return;
      }

      e.preventDefault();

      const officeFile = Array.from(files).find((f) =>
        OFFICE_FILE_EXTENSIONS.includes(getExtension(f.name)),
      );
      if (!officeFile) {
        return;
      }

      e.stopPropagation();

      const { excalidrawAPI: api, isPresenter: presenter } = stateRef.current;
      if (!presenter || !api) {
        return;
      }

      if (officeFileProcessor.isBusy) {
        toast(i18n.t('notifications.wait-other-uploading-to-finish'), {
          type: 'warning',
        });
        return;
      }

      const maxAllowedFileSize =
        store.getState().session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures
          ?.maxAllowedFileSize ?? '30';

      officeFileProcessor.start(officeFile, api, OFFICE_FILE_EXTENSIONS, maxAllowedFileSize, {
        onStart: () => {},
        onProgress: () => {},
        onSuccess: (_msg, newFile) => {
          if (newFile) {
            void switchToFile(newFile.fileId);
          }
        },
        onError: (msg) => {
          toast(msg, { type: 'error' });
        },
      });
    };

    container.addEventListener('drop', handleDrop, true);
    return () => {
      container.removeEventListener('drop', handleDrop, true);
    };
  }, []);

  return { dropContainerRef };
};

export default useWhiteboardFileDrop;
