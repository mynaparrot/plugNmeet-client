import React, { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import usePreviousPage from './helpers/hooks/usePreviousPage';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { setWhiteboardCurrentPage } from '../../store/slices/whiteboard';
import { useTranslation } from 'react-i18next';
import {
  broadcastCurrentPageNumber,
  broadcastScreenDataBySocket,
} from './helpers/handleRequestedWhiteboardData';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { toast } from 'react-toastify';

interface IFooterUIProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter: boolean;
}
const totalPagesSelector = createSelector(
  (state: RootState) => state.whiteboard.totalPages,
  (totalPages) => totalPages,
);
const currentPageSelector = createSelector(
  (state: RootState) => state.whiteboard.currentPage,
  (currentPage) => currentPage,
);

const FooterUI = ({ excalidrawAPI, isPresenter }: IFooterUIProps) => {
  const totalPages = useAppSelector(totalPagesSelector);
  const currentPage = useAppSelector(currentPageSelector);
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
    if (excalidrawAPI && isPresenter) {
      setTimeout(() => {
        const currentPage = store.getState().whiteboard.currentPage;
        displayCurrentPageData(currentPage);
      }, 100);
    }
    return () => {
      if (excalidrawAPI && isPresenter) {
        const lastPage = store.getState().whiteboard.currentPage;
        const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
        if (elms.length) {
          sessionStorage.setItem(String(lastPage), JSON.stringify(elms));
        }
      }
    };
    //eslint-disable-next-line
  }, [excalidrawAPI]);

  const savePreviousPageData = () => {
    if (!excalidrawAPI) {
      return;
    }
    // for other user we'll clean from parent component
    // because from mobile or small screen pagination part remain collapse
    // no event will be run if this part don't show
    if (isPresenter) {
      const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
      if (elms.length) {
        sessionStorage.setItem(String(previousPage), JSON.stringify(elms));
      }
      cleanExcalidraw();
      displayCurrentPageData(currentPage);
    }
  };

  const displayCurrentPageData = (currentPage) => {
    const data = sessionStorage.getItem(currentPage);
    if (data && excalidrawAPI) {
      const elements = JSON.parse(data);
      if (elements.length) {
        excalidrawAPI.updateScene({ elements });
        if (isPresenter) {
          // better to broadcast full screen
          broadcastScreenDataBySocket(elements);
        }
      }
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
      <div className="flex pt-1 wb-page-navigation">
        <button
          className="pre w-8 h-8 flex items-center justify-center"
          onClick={handlePre}
          disabled={disablePre}
        >
          <i className="pnm-arrow-left-short text-black dark:text-white text-xl opacity-50" />
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
          <i className="pnm-arrow-right-short text-black dark:text-white text-xl opacity-50" />
        </button>
      </div>
    );
  };

  const takeOverPresenter = async () => {
    const body = {
      user_id: currentUser?.userId,
      task: 'promote',
    };

    const res = await sendAPIRequest('switchPresenter', body);
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
      <div className="flex text-sm items-center justify-center relative pt-3">
        {isAdmin && !isRecorder ? (
          <button
            className="w-10 h-8 flex items-center justify-center absolute left-0 top-[3px]"
            onClick={takeOverPresenter}
          >
            <i className="pnm-presenter primaryColor text-[14px] opacity-50" />
          </button>
        ) : null}
        {t('whiteboard.page', { count: currentPage })}
      </div>
    );
  };

  return <>{isPresenter ? renderForAdmin() : renderForParticipant()}</>;
};

export default React.memo(FooterUI);
