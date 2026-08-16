import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { throttle } from 'es-toolkit';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  CaptureUpdateAction,
  Excalidraw,
  Footer,
  MainMenu,
  reconcileElements,
} from '@excalidraw/excalidraw';
import {
  AppState,
  BinaryFiles,
  Collaborator,
  CollaboratorPointer,
  ExcalidrawImperativeAPI,
  Gesture,
} from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { SetViewportOptions } from '@excalidraw/excalidraw/viewport';

// @ts-ignore
import '@excalidraw/excalidraw/index.css';
// @ts-ignore
import './style.css';

import ManageOfficeFilesModal from './manage-office-files';
import FooterUI from './footerUI';
import ExportPDFModal from './export-pdf';

import { store, useAppDispatch, useAppSelector } from '../../store';
import {
  broadcastAppStateChanges,
  broadcastCurrentFileId,
  broadcastMousePointerUpdate,
  requestCurrentWhiteboardPosition,
} from './helpers/handleRequests';
import usePrevious from './helpers/hooks/usePrevious';
import useWhiteboardSetup from './helpers/hooks/useWhiteboardSetup';
import useWhiteboardAppStateSync from './helpers/hooks/useWhiteboardAppStateSync';
import useOfficePageSyncer from './helpers/hooks/useOfficePageSyncer';
import {
  setWhiteboardCurrentPage,
  updateCurrentWhiteboardOfficeFileId,
  updateMousePointerLocation,
} from '../../store/slices/whiteboard';
import {
  A4_BOUNDARY_GUIDE_ID,
  ensureAllImagesDataIsLoaded,
  getA4WidthBasedZoom,
  getPageBoundaryMetrics,
  getSceneElementsWithoutBoundary,
  isPendingImageElement,
  orderElementsByIndex,
  prepareA4BoundaryGuide,
  ResolvedPageInfo,
  resolvePageInfoFromElements,
} from './helpers/utils';
import {
  cleanProcessedImageElementsMap,
  uploadCanvasBinaryFile,
} from './helpers/handleFiles';
import { getWhiteboardController, WHITEBOARD_REMOTE_ORIGIN } from './collab';
import { getNatsConn } from '../../helpers/nats';
import {
  A4_VIEWPORT_PADDING_LEFT,
  A4_VIEWPORT_PADDING_TOP,
  DEFAULT_PAGE_ORIENTATION,
} from './export-pdf/types';

const DEFAULT_PAGE_INFO: ResolvedPageInfo = {
  orientation: DEFAULT_PAGE_ORIENTATION,
};
import ToolbarBar from '../../assets/Icons/ToolbarBar';
import PdfIcon from '../../assets/Icons/PdfIcon';
import { RefreshIcon } from '../../assets/Icons/RefreshIcon';

interface WhiteboardProps {
  onReadyExcalidrawAPI?: (excalidrawAPI: ExcalidrawImperativeAPI) => void;
}

const CURSOR_SYNC_TIMEOUT = 33;

const Whiteboard = ({ onReadyExcalidrawAPI }: WhiteboardProps) => {
  const dispatch = useAppDispatch();
  const { i18n, t } = useTranslation();
  // static variables
  const { currentUser, isRecorder, roomId, roomSid } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      currentUser,
      isRecorder: !!currentUser?.isRecorder,
      roomId: session.currentRoom.roomId,
      roomSid: session.currentRoom.sid,
    };
  }, []);

  // Selectors
  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );
  const defaultRoomLock = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.defaultLockSettings?.lockWhiteboard,
  );
  const currentUserLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockWhiteboard,
  );

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );
  // State and Refs
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isOpenManageFilesUI, setIsOpenManageFilesUI] =
    useState<boolean>(false);
  const [isOpenExportPdfUI, setIsOpenExportPdfUI] = useState<boolean>(false);
  const [isToolbarHidden, setIsToolbarHidden] = useState<boolean>(false);

  const previousFileId = usePrevious(currentWhiteboardOfficeFileId);
  const previousPage = usePrevious(currentPage);

  // Keep mutable references to decouple state-sync values from high-frequency drawing dependencies
  const currentPageRef = useRef(currentPage);
  const currentFileIdRef = useRef(currentWhiteboardOfficeFileId);

  useEffect(() => {
    currentPageRef.current = currentPage;
    currentFileIdRef.current = currentWhiteboardOfficeFileId;
  }, [currentPage, currentWhiteboardOfficeFileId]);

  const isSwitching = useRef(false);

  // The yjs CRDT session (doc + elements map) owns all whiteboard scene sync.
  // Subscribe via useSyncExternalStore so we re-render when the active doc
  // changes (page/file switch) or a new generation is emitted.
  const controller = useMemo(() => getWhiteboardController(), []);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );

  // Determines if the current user has editing privileges.
  const canEdit = useMemo(() => {
    if (isPresenter) return true;
    // Recorders should not be able to edit.
    if (isRecorder) return false;
    if (typeof currentUserLock === 'boolean') return !currentUserLock;
    return !(defaultRoomLock ?? true);
  }, [isPresenter, currentUserLock, defaultRoomLock, isRecorder]);

  // Custom Hooks for modularity
  const { viewModeEnabled } = useWhiteboardSetup({
    excalidrawAPI,
    canEdit,
  });
  useWhiteboardAppStateSync({
    excalidrawAPI,
    isFollowing,
    isPresenter: !!isPresenter,
  });
  const { syncOfficeFilePage } = useOfficePageSyncer({
    excalidrawAPI,
    isPresenter,
    currentPage,
  });

  // Wire the yjs controller to this room's NATS transport and role.
  useEffect(() => {
    controller.configure({
      roomSid: roomSid,
      send: (type, binMessage, id, message) => {
        const conn = getNatsConn();
        if (conn) {
          void conn.sendWhiteboardYjsData(type, binMessage, id, message);
        }
      },
      canWrite: () => canEdit,
      isPrimaryResponder: () => !!isPresenter,
    });
  }, [controller, roomSid, canEdit, isPresenter]);

  // Resync the active CRDT doc after reconnects and when the tab becomes
  // visible again (state-vector handshake with the room).
  useEffect(() => {
    const conn = getNatsConn();
    if (!conn) return;
    const unsub = conn.onReconnect(() => getWhiteboardController().resync());
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        getWhiteboardController().resync();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /**
   * Applies the current yjs CRDT scene to the Excalidraw canvas.
   *
   * `controller.getElements()` returns the elements map in Yjs iteration order,
   * which is not guaranteed to be Excalidraw z-order, so we order them by their
   * fractional `index` first (mirroring Excalidraw's internal
   * `orderByFractionalIndex`; `sortElements` is not exported by
   * @excalidraw/excalidraw in 0.18.x).
   * @param init A flag to indicate if this is the initial scene load.
   */
  const applyYjsSceneToExcalidraw = useCallback(
    ({ init = false }: { init?: boolean } = {}) => {
      // 1. Do nothing if Excalidraw API is not ready.
      if (!excalidrawAPI) {
        return;
      }

      // 2. Read the current CRDT elements (including tombstones).
      const remoteElements = controller.getElements();
      // 3. Exit if there are no elements to process.
      if (!remoteElements.length) {
        return;
      }

      // 4. Get the current local elements and app state from the canvas.
      const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const appState = excalidrawAPI.getAppState();

      // 5. Reconcile local elements with remote elements to prevent conflicts
      // and merge changes smoothly. The cast satisfies the
      // `RemoteExcalidrawElement[]` parameter type; the elements originate from
      // this client's own serialized scene so they are structurally compatible.
      const reconciledElements = reconcileElements(
        localElements,
        orderElementsByIndex(remoteElements) as never,
        appState,
      );

      // 6. Ensure that any image elements have their binary data loaded.
      // This is crucial when receiving scenes from remote peers.
      ensureAllImagesDataIsLoaded(excalidrawAPI, reconciledElements);

      // 7. Update the Excalidraw scene with the reconciled elements.
      // `captureUpdate: NEVER` prevents this update from being added to the undo/redo history,
      // as it's a sync operation, not a user action.
      excalidrawAPI.updateScene({
        elements: reconciledElements,
        captureUpdate: init
          ? CaptureUpdateAction.IMMEDIATELY
          : CaptureUpdateAction.NEVER,
      });
      // 8. Clear the history to ensure a clean state after the remote update.
      excalidrawAPI.history.clear();
    },
    [excalidrawAPI, controller],
  );

  // Observe remote updates on the active yjs doc and apply them to Excalidraw.
  useEffect(() => {
    if (!snapshot?.doc) return;
    const onDocUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === WHITEBOARD_REMOTE_ORIGIN) {
        applyYjsSceneToExcalidraw({ init: false });
      }
    };
    snapshot.doc.on('update', onDocUpdate);
    return () => {
      snapshot.doc.off('update', onDocUpdate);
    };
  }, [snapshot, applyYjsSceneToExcalidraw]);

  const resetWhiteboardState = useCallback(
    (excalidrawAPI: ExcalidrawImperativeAPI) => {
      // 1. Clean up the whiteboard canvas
      excalidrawAPI.updateScene({ elements: [] });
      excalidrawAPI.addFiles([]);
      excalidrawAPI.history.clear();

      // 2. Reset the internal state for a clean slate.
      cleanProcessedImageElementsMap();
      setIsFollowing(true);
    },
    [],
  );

  /**
   * Positions the viewport at the page boundary with an initial width-based zoom.
   */
  const scrollToBoundary = useCallback(
    (
      api: ExcalidrawImperativeAPI,
      pageInfo: ResolvedPageInfo = DEFAULT_PAGE_INFO,
    ) => {
      const { width: viewportWidth } = api.getAppState();
      const {
        width: targetWidth,
        startX,
        startY,
      } = getPageBoundaryMetrics(
        pageInfo.orientation,
        pageInfo.pageWidth,
        pageInfo.pageHeight,
      );

      const initialZoom = getA4WidthBasedZoom(viewportWidth, targetWidth);

      api.updateScene({
        appState: {
          // Snap to the top-left of the red guide box plus comfortable visual padding
          scrollX: -startX + A4_VIEWPORT_PADDING_LEFT,
          scrollY: -startY + A4_VIEWPORT_PADDING_TOP,
          zoom: {
            value: initialZoom,
          },
        },
      });
    },
    [],
  );

  const addBoundaryToElements = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      pageInfo: ResolvedPageInfo = DEFAULT_PAGE_INFO,
    ) => {
      if (!isPresenter) {
        return elements;
      }
      const boundary = prepareA4BoundaryGuide(
        pageInfo.orientation,
        pageInfo.pageWidth,
        pageInfo.pageHeight,
      );
      const finalElements = elements.filter(
        (e) => e.id !== A4_BOUNDARY_GUIDE_ID,
      );
      finalElements.push(...boundary);
      return finalElements;
    },
    [isPresenter],
  );

  /**
   * Handles the logic for switching between whiteboard pages or office documents.
   * It cleans the canvas and prepares it for new data.
   */
  const handleSwitchPageOrDocument = useCallback(async () => {
    // 1. Do nothing if Excalidraw API is not ready.
    if (!excalidrawAPI) return;

    // 2. Set a flag to prevent other actions during the transition.
    isSwitching.current = true;

    // 3. Clean up the whiteboard canvas for all users.
    resetWhiteboardState(excalidrawAPI);

    // 4. Point the CRDT at the new page/file and apply the hydrated/remote
    // scene for everyone (presenter and followers alike). Scene content now
    // syncs via yjs, so there is no sendClearWhiteboardSignal() anymore.
    try {
      await controller.sync(currentWhiteboardOfficeFileId, currentPage, {
        hydrate: !!isPresenter,
      });
      applyYjsSceneToExcalidraw({ init: true });

      if (isPresenter) {
        // 5. If the new page has no CRDT content yet, insert the office page
        // elements (presenter-only, idempotent per page).
        const hasLocal = controller.getElements().length > 0;
        let elements: readonly ExcalidrawElement[] | null | undefined = null;

        if (!hasLocal) {
          elements = await syncOfficeFilePage(currentPage);
        }

        const scene = elements ?? controller.getElements();
        const pageInfo = resolvePageInfoFromElements(scene);
        excalidrawAPI.updateScene({
          elements: addBoundaryToElements(scene, pageInfo),
        });
        scrollToBoundary(excalidrawAPI, pageInfo);

        // 6. Persist any newly inserted office-page elements into the CRDT so
        // they reach followers.
        if (elements && elements.length) {
          controller.syncLocalElements(elements);
        }

        // Broadcast the full authoritative scene so followers converge without
        // relying solely on incremental updates.
        controller.broadcastFullState();
      }
    } finally {
      // 7. Always release the switch lock, even if syncing/loading throws.
      isSwitching.current = false;
    }
  }, [
    excalidrawAPI,
    isPresenter,
    currentPage,
    currentWhiteboardOfficeFileId,
    controller,
    resetWhiteboardState,
    syncOfficeFilePage,
    addBoundaryToElements,
    scrollToBoundary,
    applyYjsSceneToExcalidraw,
  ]);

  // clean up store during exit
  useEffect(() => {
    return () => {
      dispatch(updateMousePointerLocation(''));
      cleanProcessedImageElementsMap();
    };
  }, [dispatch]);

  // on mount: point the CRDT at the current page/file and apply the scene.
  // Followers converge via the state-vector sync handshake; the presenter
  // additionally broadcasts the active file id (control message).
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    const initialize = async () => {
      isSwitching.current = true;
      try {
        if (isPresenter) {
          // Keep broadcasting the active file id (control message) so followers
          // converge on the same file/page. Scene content now syncs via yjs, so
          // there is no sendClearWhiteboardSignal() anymore.
          await broadcastCurrentFileId(currentWhiteboardOfficeFileId);
          await controller.sync(currentWhiteboardOfficeFileId, currentPage, {
            hydrate: true,
          });
          applyYjsSceneToExcalidraw({ init: true });

          const elements = excalidrawAPI.getSceneElements();
          const pageInfo = resolvePageInfoFromElements(elements);
          excalidrawAPI.updateScene({
            elements: addBoundaryToElements(elements, pageInfo),
          });
          scrollToBoundary(excalidrawAPI, pageInfo);
          controller.broadcastFullState();
        } else {
          const position = await requestCurrentWhiteboardPosition();
          const fileId = position?.fileId ?? currentWhiteboardOfficeFileId;
          const page = position?.page ?? currentPage;

          if (
            position &&
            (fileId !== currentWhiteboardOfficeFileId || page !== currentPage)
          ) {
            dispatch(updateCurrentWhiteboardOfficeFileId(fileId));
            dispatch(setWhiteboardCurrentPage(page));
          }

          await controller.sync(fileId, page, { hydrate: false });
          applyYjsSceneToExcalidraw({ init: true });
        }
      } finally {
        isSwitching.current = false;
      }
    };

    setTimeout(() => void initialize(), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI, controller, applyYjsSceneToExcalidraw]);

  // Effect for page or file changes
  useEffect(() => {
    const hasFileChanged =
      previousFileId && currentWhiteboardOfficeFileId !== previousFileId;
    const hasPageChanged = previousPage && currentPage !== previousPage;

    if (!isSwitching.current && (hasFileChanged || hasPageChanged)) {
      void handleSwitchPageOrDocument();
    }
  }, [
    currentWhiteboardOfficeFileId,
    previousFileId,
    currentPage,
    previousPage,
    handleSwitchPageOrDocument,
  ]);

  /**
   * This is the primary callback for any change on the Excalidraw canvas.
   *
   * It's important to note that on every change (e.g., drawing, moving, resizing),
   * this function receives the *entire* scene's elements, not just the modified ones.
   *
   * Local edits are written into the yjs CRDT (which broadcasts the resulting
   * update to the room); pending image uploads are handled first and synced by
   * the follow-up onChange once their status becomes 'saved'.
   */
  const handleCanvasChange = useCallback(
    (
      _elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      if (
        !excalidrawAPI || // API not ready
        !currentUser || // User not available
        isSwitching.current // A page/file switch is in progress
      ) {
        return;
      }

      if (canEdit) {
        // The onChange `elements` argument may omit `isDeleted` tombstones
        // (e.g. when the last element is deleted), so derive the authoritative
        // scene from the Excalidraw API to make sure deletions propagate to the
        // CRDT.
        const elms = getSceneElementsWithoutBoundary(excalidrawAPI);
        if (elms.length) {
          // Pending images must be uploaded before they can be synced; they are
          // written into the CRDT by the follow-up onChange after the upload
          // flips `status` to 'saved' (uploadCanvasBinaryFile updates the scene
          // element in place).
          const syncableElements: ExcalidrawElement[] = [];
          for (const elm of elms) {
            if (isPendingImageElement(elm)) {
              const fileData = elm.fileId && files[elm.fileId];
              if (fileData) {
                void uploadCanvasBinaryFile(elm, fileData, excalidrawAPI);
              }
              continue;
            }
            syncableElements.push(elm);
          }
          if (syncableElements.length) {
            controller.syncLocalElements(syncableElements);
          }
        }
      }

      // Only the presenter can broadcast app state changes (zoom, scroll, etc.).
      if (isPresenter) {
        void broadcastAppStateChanges(
          appState.height,
          appState.width,
          appState.scrollX,
          appState.scrollY,
          appState.zoom.value,
          appState.theme,
          appState.viewBackgroundColor,
          appState.zenModeEnabled,
          appState.gridSize,
        );
      }
    },
    [excalidrawAPI, currentUser, canEdit, isPresenter, controller],
  );

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const onPointerUpdate = useCallback(
    throttle(
      (payload: {
        pointer: CollaboratorPointer;
        button: 'down' | 'up';
        pointersMap: Gesture['pointers'];
      }) => {
        if (!canEdit || !currentUser || payload.pointersMap.size >= 2) {
          return;
        }
        const msg: Partial<Collaborator> = {
          pointer: payload.pointer,
          button: payload.button || 'up',
          selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
          id: currentUser.userId,
          username: currentUser.name,
          avatarUrl: currentUser.metadata?.profilePic,
        };
        void broadcastMousePointerUpdate(msg);
      },
      CURSOR_SYNC_TIMEOUT,
    ),
    [canEdit, currentUser, excalidrawAPI],
  );

  const showSwitchingWarning = useCallback(() => {
    if (isSwitching.current) {
      toast(t('notifications.whiteboard-other-task-to-finish'), {
        type: 'warning',
      });
      return true;
    }
    return false;
  }, [t]);

  const renderTopRightUI = useCallback(
    () => (
      <>
        {screenWidth > 767 && isPresenter && excalidrawAPI && (
          <div className="menu relative z-10">
            <button
              type="button"
              onClick={() => setIsOpenManageFilesUI(true)}
              className="wb-manage-upload-file ml-1 focus-ring"
            >
              <i className="pnm-attachment text-[13px]" />
              {t('whiteboard.manage-files')}
            </button>
          </div>
        )}
      </>
    ),
    [isPresenter, excalidrawAPI, t, screenWidth],
  );

  const renderFooter = useMemo(
    () => (
      <FooterUI
        excalidrawAPI={excalidrawAPI}
        isPresenter={!!isPresenter}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        showSwitchingWarning={showSwitchingWarning}
      />
    ),
    [excalidrawAPI, isPresenter, isFollowing, showSwitchingWarning],
  );

  const onInitializeSetExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      setExcalidrawAPI(api);
      if (onReadyExcalidrawAPI) {
        onReadyExcalidrawAPI(api);
      }
    },
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
    [],
  );

  const initialStateViewport = useMemo(() => {
    // Fixed portrait reference frame. Do not retarget by orientation at runtime —
    // page switches only adjust scroll/zoom via scrollToBoundary.
    const {
      width: targetWidth,
      height: targetHeight,
      startX,
      startY,
    } = getPageBoundaryMetrics('portrait');
    const extraPages = targetHeight * 3;

    const viewport: SetViewportOptions = {
      target: [startX, startY, startX + targetWidth, startY + extraPages],
      fit: 'none',
      lock: {
        scroll: true,
        overscroll: false,
        zoom: false,
      },
      offsets: {
        top: 60,
        left: 20,
        right: 20,
      },
    };

    return {
      viewport: viewport,
    };
  }, []);

  return (
    <div
      className={`excalidraw-wrapper flex-1 w-full max-w-[1280px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9 z-0 ${
        isToolbarHidden ? 'toolbar-hidden' : ''
      }`}
      role="region"
      aria-label={t('whiteboard.whiteboard-area').toString()}
    >
      {isPresenter && excalidrawAPI && (
        <>
          <ManageOfficeFilesModal
            roomId={roomId}
            excalidrawAPI={excalidrawAPI}
            onClose={() => setIsOpenManageFilesUI(false)}
            isOpen={isOpenManageFilesUI}
            showSwitchingWarning={showSwitchingWarning}
          />
          <ExportPDFModal
            excalidrawAPI={excalidrawAPI}
            onClose={() => setIsOpenExportPdfUI(false)}
            isOpen={isOpenExportPdfUI}
          />
        </>
      )}
      <div dir="ltr" className="h-full w-full">
        <Excalidraw
          onInitialize={onInitializeSetExcalidrawAPI}
          onChange={handleCanvasChange}
          onPointerUpdate={onPointerUpdate}
          viewModeEnabled={viewModeEnabled}
          isCollaborating={true}
          initialState={initialStateViewport}
          theme={theme}
          name="plugNmeet whiteboard"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveAsImage: !isRecorder,
            },
            tools: {
              image: true,
            },
            getFormFactor: (width) => {
              // Use mobile UI on screens smaller than 768px
              if (width < 768) {
                return 'phone';
              }
              // Force 'tablet' on larger screens for a compact desktop layout
              return 'tablet';
            },
          }}
          langCode={i18n.languages[0]}
          renderTopRightUI={renderTopRightUI}
        >
          <MainMenu>
            <MainMenu.DefaultItems.SaveAsImage />
            {isPresenter && excalidrawAPI && (
              <>
                <button
                  type="button"
                  className="radix-menu-item dropdown-menu-item dropdown-menu-item-base focus-ring"
                  onClick={() => setIsOpenExportPdfUI(true)}
                >
                  <div className="dropdown-menu-item__icon">
                    <PdfIcon className="w-[13px] h-[13px]" />
                  </div>
                  <div className="dropdown-menu-item__text">
                    {t('whiteboard.export-pdf-title')}
                  </div>
                </button>
                <button
                  type="button"
                  className="radix-menu-item dropdown-menu-item dropdown-menu-item-base focus-ring"
                  onClick={() => {
                    setIsOpenManageFilesUI(true);
                  }}
                >
                  <div className="dropdown-menu-item__icon">
                    <i className="pnm-attachment text-[13px]" />
                  </div>
                  <div className="dropdown-menu-item__text">
                    {t('whiteboard.manage-files-menu-title')}
                  </div>
                </button>
                <button
                  type="button"
                  className="radix-menu-item dropdown-menu-item dropdown-menu-item-base focus-ring"
                  onClick={handleSwitchPageOrDocument}
                >
                  <div className="dropdown-menu-item__icon">
                    <RefreshIcon />
                  </div>
                  <div className="dropdown-menu-item__text">
                    {t('whiteboard.force-sync')}
                  </div>
                </button>
              </>
            )}
            {!viewModeEnabled && (
              <button
                type="button"
                className="radix-menu-item dropdown-menu-item dropdown-menu-item-base focus-ring"
                onClick={() => setIsToolbarHidden(!isToolbarHidden)}
              >
                <div className="dropdown-menu-item__icon">
                  <ToolbarBar className="w-[13px] h-[13px]" />
                </div>
                <div className="dropdown-menu-item__text">
                  {isToolbarHidden
                    ? t('whiteboard.show-toolbar')
                    : t('whiteboard.hide-toolbar')}
                </div>
              </button>
            )}
            <MainMenu.DefaultItems.Help />
            {screenWidth <= 767 && renderFooter}
          </MainMenu>
          {screenWidth > 767 && <Footer>{renderFooter}</Footer>}
        </Excalidraw>
      </div>
    </div>
  );
};

export default Whiteboard;
