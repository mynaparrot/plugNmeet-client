import React, { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import usePreviousPage from './helpers/hooks/usePreviousPage';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { setWhiteboardCurrentPage } from '../../store/slices/whiteboard';
import { useTranslation } from 'react-i18next';
import { broadcastCurrentPageNumber } from './helpers/handleRequestedWhiteboardData';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';
import {
  CommonResponse,
  SwitchPresenterReq,
  SwitchPresenterTask,
} from '../../helpers/proto/plugnmeet_common_api_pb';
import usePreviousFileId from './helpers/hooks/usePreviousFileId';
import { displaySavedPageData, savePageData } from './helpers/utils';

interface IFooterUIProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter: boolean;
}
const totalPagesSelector = createSelector(
  (state: RootState) => state.whiteboard,
  (whiteboard) => whiteboard.totalPages,
);
const currentPageSelector = createSelector(
  (state: RootState) => state.whiteboard,
  (whiteboard) => whiteboard.currentPage,
);
const currentWhiteboardOfficeFileIdSelector = createSelector(
  (state: RootState) => state.whiteboard,
  (whiteboard) => whiteboard.currentWhiteboardOfficeFileId,
);

const FooterUI = ({ excalidrawAPI, isPresenter }: IFooterUIProps) => {
  const totalPages = useAppSelector(totalPagesSelector);
  const currentPage = useAppSelector(currentPageSelector);
  const currentWhiteboardOfficeFileId = useAppSelector(
    currentWhiteboardOfficeFileIdSelector,
  );
  const previousFileId = usePreviousFileId(currentWhiteboardOfficeFileId);
  const [options, setOptions] = useState<Array<JSX.Element>>();
  const [disablePre, setDisablePre] = useState(true);
  const [disableNext, setDisableNext] = useState(false);
  const previousPage = usePreviousPage(currentPage);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const currentUser = store.getState().session.currentUser;
  const isAdmin = currentUser?.metadata?.is_admin;
  const isRecorder = currentUser?.isRecorder;

  useEffect(() => {
    if (previousPage && currentPage !== previousPage && excalidrawAPI) {
      savePreviousPageData();
    }
    //eslint-disable-next-line
  }, [currentPage, previousPage, excalidrawAPI]);

  useEffect(() => {
    if (currentPage > 1) {
      setDisablePre(false);
    }
    if (currentPage === 1) {
      setDisablePre(true);
    }

    if (disableNext) {
      if (currentPage !== totalPages) {
        setDisableNext(false);
      }
    } else {
      if (currentPage === totalPages) {
        setDisableNext(true);
      }
    }
  }, [currentPage, disableNext, totalPages]);

  useEffect(() => {
    const element: Array<JSX.Element> = [];
    for (let i = 0; i < totalPages; i++) {
      element.push(
        <option key={i} value={i + 1}>
          {t('whiteboard.page', { count: i + 1 })}
        </option>,
      );
    }
    setOptions(element);
    //eslint-disable-next-line
  }, [totalPages]);

  useEffect(() => {
    if (currentWhiteboardOfficeFileId !== previousFileId && isPresenter) {
      setTimeout(() => {
        if (excalidrawAPI) {
          displaySavedPageData(excalidrawAPI, isPresenter, currentPage);
        }
      }, 500);
    }
    //eslint-disable-next-line
  }, [currentWhiteboardOfficeFileId, previousFileId, currentPage]);

  const savePreviousPageData = () => {
    if (!excalidrawAPI) {
      return;
    }
    // for other user we'll clean from parent component
    // because from mobile or small screen pagination part remain collapse
    // no event will be run if this part don't show
    if (isPresenter) {
      if (previousPage) {
        savePageData(excalidrawAPI, previousPage);
      }
      cleanExcalidraw();
      displaySavedPageData(excalidrawAPI, isPresenter, currentPage);
    }
  };

  const cleanExcalidraw = () => {
    excalidrawAPI?.updateScene({
      elements: [],
    });
  };

  const setCurrentPage = (page: number) => {
    broadcastCurrentPageNumber(page);
    setTimeout(() => {
      dispatch(setWhiteboardCurrentPage(page));
    }, 500);
  };

  const handlePre = () => {
    setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    setCurrentPage(currentPage + 1);
  };

  const renderForAdmin = () => {
    return (
      <div className="flex wb-page-navigation ml-2">
        <button
          className="pre w-8 h-8 flex items-center justify-center"
          onClick={handlePre}
          disabled={disablePre}
        >
          <i className="pnm-arrow-left-short text-black dark:text-white text-xl opacity-50 rtl:rotate-180" />
        </button>
        <select
          id="pages"
          name="pages"
          className="pagesOpts block h-8 py-1 px-3 border border-gray-300 bg-white dark:bg-darkSecondary rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          onChange={(e) => setCurrentPage(Number(e.currentTarget.value))}
          value={currentPage}
        >
          {options}
        </select>
        <button
          className="next w-8 h-8 flex items-center justify-center"
          onClick={handleNext}
          disabled={disableNext}
        >
          <i className="pnm-arrow-right-short text-black dark:text-white text-xl opacity-50 rtl:rotate-180" />
        </button>
      </div>
    );
  };

  const takeOverPresenter = async () => {
    const body = new SwitchPresenterReq({
      userId: currentUser?.userId,
      task: SwitchPresenterTask.PROMOTE,
    });

    const r = await sendAPIRequest(
      'switchPresenter',
      body.toBinary(),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = CommonResponse.fromBinary(new Uint8Array(r));

    if (res.status) {
      toast(t('left-panel.menus.notice.presenter-changed'), {
        toastId: 'lock-setting-status',
        type: 'info',
      });
    } else {
      toast(t(res.msg), {
        toastId: 'lock-setting-status',
        type: 'error',
      });
    }
  };

  const renderForParticipant = () => {
    return (
      <div
        className={`flex text-sm items-center justify-start md:justify-center relative ${
          isAdmin && !isRecorder
            ? 'ltr:pl-3 rtl:pr-3 md:pl-12  md:rtl:pr-4'
            : 'ltr:pl-3 rtl:pr-3'
        } `}
      >
        {isAdmin && !isRecorder ? (
          <button
            className="w-8 h-8 rounded-lg border border-solid border-[#3d3d3d] text-[#3d3d3d] dark:text-[#b8b8b8] dark:bg-[#262627] dark:hover:bg-[#3d3d3d] hover:bg-[#3d3d3d] hover:text-[#b8b8b8] flex items-center justify-center ltr:mr-2 rtl:ml-2"
            onClick={takeOverPresenter}
          >
            <i className="pnm-presenter text-[14px]" />
          </button>
        ) : null}
        {t('whiteboard.page', { count: currentPage })}
      </div>
    );
  };

  return <>{isPresenter ? renderForAdmin() : renderForParticipant()}</>;
};

export default React.memo(FooterUI);
