import React, { useMemo } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  SwitchPresenterReqSchema,
  SwitchPresenterTask,
} from 'plugnmeet-protocol-js';
import { debounce } from 'es-toolkit';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { useTranslation } from 'react-i18next';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { setWhiteboardCurrentPage } from '../../store/slices/whiteboard';
import { broadcastCurrentPageNumber } from './helpers/handleRequestedWhiteboardData';
import sendAPIRequest from '../../helpers/api/plugNmeetAPI';
import { savePageData } from './helpers/utils';

interface IFooterUIProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter: boolean;
  isFollowing?: boolean;
  setIsFollowing?: (value: boolean) => void;
  showSwitchingWarning: () => boolean;
}

const FooterUI = ({
  excalidrawAPI,
  isPresenter,
  isFollowing,
  setIsFollowing,
  showSwitchingWarning,
}: IFooterUIProps) => {
  const totalPages = useAppSelector((state) => state.whiteboard.totalPages);
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);

  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { currentUser, isAdmin, isRecorder } = useMemo(() => {
    const currentUser = store.getState().session.currentUser;
    return {
      currentUser,
      isAdmin: currentUser?.metadata?.isAdmin,
      isRecorder: currentUser?.isRecorder,
    };
  }, []);

  const debouncedSetCurrentPage = useMemo(
    () =>
      debounce(async (newPage: number, pageToSave: number) => {
        // First, save the state of the page we are leaving.
        if (isPresenter && excalidrawAPI) {
          savePageData(excalidrawAPI, pageToSave);
        }

        // Then, proceed with changing the page.
        await broadcastCurrentPageNumber(newPage);
        dispatch(setWhiteboardCurrentPage(newPage));
      }, 300),
    [dispatch, isPresenter, excalidrawAPI],
  );

  const setCurrentPage = (page: number) => {
    if (showSwitchingWarning()) return;
    debouncedSetCurrentPage(page, currentPage);
  };

  const handlePre = () => {
    if (showSwitchingWarning()) return;
    setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (showSwitchingWarning()) return;
    setCurrentPage(currentPage + 1);
  };

  const handleFollowPresenter = () => {
    if (setIsFollowing) {
      setIsFollowing(!isFollowing);
    }
  };

  const renderForAdmin = () => {
    return (
      <div className="flex wb-page-navigation ml-2">
        <button className="pre" onClick={handlePre} disabled={currentPage <= 1}>
          <i className="pnm-arrow-left-short text-black dark:text-white text-xl opacity-50 rtl:rotate-180" />
        </button>
        <select
          id="pages"
          name="pages"
          className="pagesOpts appearance-none cursor-pointer block h-8 py-1 px-3 border border-gray-300 dark:border-gray-100 border-t-0 border-b-0 bg-transparent shadow-xs focus:outline-hidden sm:text-sm"
          onChange={(e) => setCurrentPage(Number(e.currentTarget.value))}
          value={currentPage}
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <option key={i} value={i + 1}>
              {t('whiteboard.page', { count: i + 1 })}
            </option>
          ))}
        </select>
        <button
          className="next"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
        >
          <i className="pnm-arrow-right-short text-black dark:text-white text-xl opacity-50 rtl:rotate-180" />
        </button>
      </div>
    );
  };

  const takeOverPresenter = async () => {
    const body = create(SwitchPresenterReqSchema, {
      userId: currentUser?.userId,
      task: SwitchPresenterTask.PROMOTE,
    });

    const r = await sendAPIRequest(
      'switchPresenter',
      toBinary(SwitchPresenterReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

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
        className={`renderForParticipant flex gap-2 text-sm items-center justify-start md:justify-center relative ${
          isAdmin && !isRecorder
            ? 'ltr:pl-3 rtl:pr-3 md:pl-12  md:rtl:pr-4'
            : 'ltr:pl-3 rtl:pr-3'
        } `}
      >
        {isAdmin && !isRecorder && (
          <button className="presenter" onClick={takeOverPresenter}>
            <i className="pnm-presenter text-[14px]" />
          </button>
        )}
        <button
          className={`px-2 ${isFollowing ? 'following' : ''}`}
          onClick={handleFollowPresenter}
          title={
            isFollowing
              ? t('whiteboard.unfollow-presenter-tooltip')
              : t('whiteboard.follow-presenter-tooltip')
          }
        >
          <i
            className={`pnm-device-connected text-[14px] ltr:mr-1 rtl:ml-1 ${
              isFollowing ? 'animate-pulse' : ''
            }`}
          />
          {isFollowing ? t('whiteboard.unfollow') : t('whiteboard.follow')}
        </button>
        {t('whiteboard.page', { count: currentPage })}
      </div>
    );
  };

  return isPresenter ? renderForAdmin() : renderForParticipant();
};

export default React.memo(FooterUI);
