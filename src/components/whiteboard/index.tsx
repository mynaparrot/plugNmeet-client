import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  CollaboratorPointer,
  ExcalidrawImperativeAPI,
  Gesture,
} from '@excalidraw/excalidraw/types';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { SetViewportOptions } from '@excalidraw/excalidraw/viewport';
import { RemoteExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile';

import '@excalidraw/excalidraw/index.css';
import './style.css';

import ManageOfficeFilesModal from './manage-office-files';
import FooterUI from './footerUI';
import ExportPDFModal from './export-pdf';
import WhiteboardAI from './ai';

import { store, useAppSelector } from '../../store';
import { broadcastAppStateChanges, broadcastCurrentFileId } from './helpers/handleRequests';
import usePrevious from './helpers/hooks/usePrevious';
import useWhiteboardSetup from './helpers/hooks/useWhiteboardSetup';
import useWhiteboardAppStateSync from './helpers/hooks/useWhiteboardAppStateSync';
import useOfficePageSyncer from './helpers/hooks/useOfficePageSyncer';
import useWhiteboardFileDrop from './helpers/hooks/useWhiteboardFileDrop';
import useWhiteboardSessionPersistence from './helpers/hooks/useWhiteboardSessionPersistence';
import {
  A4_BOUNDARY_GUIDE_ID,
  ensureAllImagesDataIsLoaded,
  getA4WidthBasedZoom,
  getPageBoundaryMetrics,
  getSceneAndVersionWithoutBoundary,
  isPendingImageElement,
  prepareA4BoundaryGuide,
  ResolvedPageInfo,
  resolvePageInfoFromElements,
} from './helpers/utils';
import {
  cleanProcessedImageElementsMap,
  primeExcalidrawImageCache,
  registerRoomWhiteboardFiles,
  uploadCanvasBinaryFile,
} from './helpers/handleFiles';
import { getWhiteboardController } from './collab';
import type { WhiteboardPresence } from './collab/types';
import {
  LatestNavigationQueue,
  runNavigationTransition,
  type NavigationTarget,
  type OfficePageLoad,
} from './helpers/navigationQueue';
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
  const isPresenter = useAppSelector((state) => state.session.currentUser?.metadata?.isPresenter);
  const defaultRoomLock = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings?.lockWhiteboard,
  );
  const currentUserLock = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWhiteboard,
  );

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const screenWidth = useAppSelector((state) => state.bottomIconsActivity.screenWidth);
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );
  // State and Refs
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isOpenManageFilesUI, setIsOpenManageFilesUI] = useState<boolean>(false);
  const [isOpenExportPdfUI, setIsOpenExportPdfUI] = useState<boolean>(false);
  const [isToolbarHidden, setIsToolbarHidden] = useState<boolean>(false);

  const previousFileId = usePrevious(currentWhiteboardOfficeFileId);
  const previousPage = usePrevious(currentPage);

  const isSwitching = useRef(false);
  const lastBroadcastOrReceivedSceneVersion = useRef<number>(-1);

  // The yjs CRDT session (doc + elements map) owns all whiteboard scene sync.
  const controller = useMemo(() => getWhiteboardController(), []);

  // Latest-request-wins ownership for page/file switches and the bootstrap.
  const navigation = useMemo(() => new LatestNavigationQueue(), []);

  /** Whether the controller's active doc is still the newest navigation target. */
  const isControllerAtTarget = useCallback(() => {
    const target = navigation.target;
    if (!target) {
      return true;
    }
    const snapshot = controller.getSnapshot();
    return !!snapshot && snapshot.fileId === target.fileId && snapshot.page === target.page;
  }, [controller, navigation]);

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
  const { tryRestoreViewport } = useWhiteboardSessionPersistence({
    excalidrawAPI,
    viewModeEnabled,
    currentFileId: currentWhiteboardOfficeFileId,
    currentPage,
    isSwitching,
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
  const { dropContainerRef } = useWhiteboardFileDrop({
    excalidrawAPI,
    isPresenter: !!isPresenter,
  });

  /** Paints the yjs CRDT scene; `reconcileElements` restores Excalidraw's z-order. */
  const applySceneToExcalidraw = useCallback(
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

      // 5. The cast satisfies the `RemoteExcalidrawElement[]` parameter type.
      const reconciledElements = reconcileElements(
        localElements,
        remoteElements as RemoteExcalidrawElement[],
        appState,
      );

      // 6. Register cached binary data synchronously so the images paint immediately.
      ensureAllImagesDataIsLoaded(excalidrawAPI, reconciledElements);

      // 7. Keep the follow-up onChange from re-broadcasting what we just applied.
      lastBroadcastOrReceivedSceneVersion.current =
        getSceneAndVersionWithoutBoundary(reconciledElements).version;

      // 8. Update the Excalidraw scene with the reconciled elements.
      excalidrawAPI.updateScene({
        elements: reconciledElements,
        captureUpdate: init ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.NEVER,
      });

      // 9. Clear the history to ensure a clean state after the remote update.
      excalidrawAPI.history.clear();
    },
    [excalidrawAPI, controller],
  );

  // Wire the yjs controller to this room's NATS transport and role.
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    // A fresh instance has an empty image cache: stale bookkeeping would leave
    // image elements as grey placeholders.
    cleanProcessedImageElementsMap(excalidrawAPI);

    controller.configure({
      excalidrawAPI,
      roomSid,
      onRemoteUpdate: () => {
        // During a switch only the doc of the newest navigation target may
        // paint: an obsolete controller scope must not leak onto the canvas.
        if (isSwitching.current && !isControllerAtTarget()) {
          return;
        }
        applySceneToExcalidraw({ init: false });
      },
      canWrite: () => canEdit,
      isPrimaryResponder: () => !!isPresenter,
    });
  }, [
    excalidrawAPI,
    controller,
    roomSid,
    canEdit,
    isPresenter,
    applySceneToExcalidraw,
    isControllerAtTarget,
  ]);

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

  // Presenter only: backfill missing page snapshots and register the room's
  // office files (authoritative page counts for a promoted presenter).
  useEffect(() => {
    if (isPresenter) {
      void getWhiteboardController().backfillMissingPages();
      void registerRoomWhiteboardFiles(roomId);
    }
  }, [isPresenter, roomId]);

  const resetWhiteboardState = useCallback((excalidrawAPI: ExcalidrawImperativeAPI) => {
    excalidrawAPI.updateScene({ elements: [] });
    excalidrawAPI.history.clear();

    // Re-arm the broadcast guard for the next page/file.
    lastBroadcastOrReceivedSceneVersion.current = -1;

    // Drop the image cache so nothing from the previous file leaks into the next.
    cleanProcessedImageElementsMap(excalidrawAPI);
    setIsFollowing(true);
  }, []);

  /**
   * Restores the stored viewport of `target`, else positions the viewport at the
   * page boundary with a width-based zoom.
   */
  const restoreOrScrollToBoundary = useCallback(
    (
      api: ExcalidrawImperativeAPI,
      pageInfo: ResolvedPageInfo = DEFAULT_PAGE_INFO,
      target?: NavigationTarget,
    ) => {
      if (target && tryRestoreViewport(target.fileId, target.page)) {
        return;
      }

      const { width: viewportWidth } = api.getAppState();
      const {
        width: targetWidth,
        startX,
        startY,
      } = getPageBoundaryMetrics(pageInfo.orientation, pageInfo.pageWidth, pageInfo.pageHeight);

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
    [tryRestoreViewport],
  );

  const addBoundaryToElements = useCallback(
    (elements: readonly ExcalidrawElement[], pageInfo: ResolvedPageInfo = DEFAULT_PAGE_INFO) => {
      if (!isPresenter) {
        return elements;
      }
      const boundary = prepareA4BoundaryGuide(
        pageInfo.orientation,
        pageInfo.pageWidth,
        pageInfo.pageHeight,
      );
      const finalElements = elements.filter((e) => e.id !== A4_BOUNDARY_GUIDE_ID);
      finalElements.push(...boundary);
      return finalElements;
    },
    [isPresenter],
  );

  /** Merges the canvas scene into the CRDT; pending images sync via the follow-up onChange. */
  const syncCanvasToCrdt = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles | null | undefined,
      options?: { force?: boolean },
    ) => {
      if (!excalidrawAPI || !canEdit) {
        return;
      }
      const { elms, version } = getSceneAndVersionWithoutBoundary(elements);
      if (!elms.length) {
        return;
      }
      // Skip re-broadcasting the scene we just applied, or a redundant CRDT
      // write of an unchanged scene. `force` bypasses that gate (page switch).
      if (!options?.force && version === lastBroadcastOrReceivedSceneVersion.current) {
        return;
      }
      lastBroadcastOrReceivedSceneVersion.current = version;

      const syncableElements: ExcalidrawElement[] = [];
      for (const elm of elms) {
        if (isPendingImageElement(elm)) {
          const fileData = elm.fileId ? files?.[elm.fileId] : undefined;
          if (fileData) {
            void uploadCanvasBinaryFile(elm, fileData, excalidrawAPI);
          }
          continue;
        }
        syncableElements.push(elm);
      }
      if (syncableElements.length) {
        controller.mergeElements(
          syncableElements,
          (id) =>
            id === appState.editingTextElement?.id ||
            id === appState.resizingElement?.id ||
            id === appState.newElement?.id,
        );
      }
    },
    [excalidrawAPI, canEdit, controller],
  );

  /**
   * Releases the switch lock. Only the queue calls this once nothing is left,
   * and only while the CRDT is still at the newest target.
   */
  const releaseTransitionLock = useCallback(() => {
    isSwitching.current = false;
    if (!excalidrawAPI || !isControllerAtTarget()) {
      return;
    }
    // Edits dropped during the switch are merged now (the merge is version-aware).
    syncCanvasToCrdt(
      excalidrawAPI.getSceneElementsIncludingDeleted(),
      excalidrawAPI.getAppState(),
      excalidrawAPI.getFiles(),
      { force: true },
    );
  }, [excalidrawAPI, syncCanvasToCrdt, isControllerAtTarget]);

  /** One page/file switch; a superseded transition leaves no trace anywhere. */
  const runNavigation = useCallback(
    async (target: NavigationTarget, isCurrent: () => boolean): Promise<boolean> => {
      if (!excalidrawAPI) {
        return false;
      }

      return runNavigationTransition(target, isCurrent, {
        isPresenter: !!isPresenter,
        reset: () => {
          isSwitching.current = true;
          resetWhiteboardState(excalidrawAPI);
        },
        sync: (next) => controller.sync(next.fileId, next.page, { hydrate: !!isPresenter }),
        paint: () => applySceneToExcalidraw({ init: true }),
        // Office pages are presenter-only and idempotent: existing CRDT content needs no insert.
        loadOfficePage: (next, stillCurrent) =>
          controller.getElements().length > 0
            ? Promise.resolve(null)
            : syncOfficeFilePage(next.fileId, next.page, stillCurrent),
        applyOfficePage: (load: OfficePageLoad | null) => {
          // Re-read the live scene: edits made while the page image loaded must survive.
          const existingScene = excalidrawAPI.getSceneElementsIncludingDeleted();
          const scene = load ? [...existingScene, ...load.elements] : existingScene;
          const pageInfo = resolvePageInfoFromElements(scene);

          if (load) {
            excalidrawAPI.addFiles(load.images);
          }
          // `addFiles` drops the image-cache entry of each new file, so hand over
          // the pre-decoded bitmaps afterwards.
          const primed = load ? primeExcalidrawImageCache(excalidrawAPI, load.images) : true;
          excalidrawAPI.updateScene({
            elements: addBoundaryToElements(scene, pageInfo),
          });
          if (!primed) {
            // Nothing was primed and the scene was empty on `addFiles`: re-running it
            // with the image elements present lets Excalidraw decode right away.
            excalidrawAPI.addFiles([]);
          }
          restoreOrScrollToBoundary(excalidrawAPI, pageInfo, target);

          // Persist newly inserted office-page elements so followers receive them.
          if (load?.elements.length) {
            controller.mergeElements(load.elements);
          }
        },
        // Broadcast the full authoritative scene so followers converge.
        broadcast: () => controller.broadcastFullState(),
      });
    },
    [
      excalidrawAPI,
      isPresenter,
      controller,
      resetWhiteboardState,
      syncOfficeFilePage,
      addBoundaryToElements,
      restoreOrScrollToBoundary,
      applySceneToExcalidraw,
    ],
  );

  /** Queues a switch to `target`; only the newest target is ever applied. */
  const startNavigation = useCallback(
    (target: NavigationTarget, options?: { force?: boolean }) => {
      navigation.request(target, options);
      void navigation.drain(runNavigation, releaseTransitionLock);
    },
    [navigation, runNavigation, releaseTransitionLock],
  );

  /**
   * Initial navigation: resolves the room's active scope (donor data for followers,
   * the store scope for the presenter) and paints it; a newer switch supersedes it.
   */
  const runInitialNavigation = useCallback(
    async (isCurrent: () => boolean): Promise<void> => {
      if (!excalidrawAPI || !isCurrent()) {
        return;
      }
      isSwitching.current = true;

      // Read the live values: a page/file change may already have landed.
      const { currentWhiteboardOfficeFileId, currentPage } = store.getState().whiteboard;
      let target: NavigationTarget = { fileId: currentWhiteboardOfficeFileId, page: currentPage };

      if (isPresenter) {
        // Broadcast the active file id (control message); scene content syncs via yjs.
        await broadcastCurrentFileId(target.fileId, target.page);
        if (!isCurrent()) {
          return;
        }
      } else {
        const donor = await Promise.race([
          controller.requestInitialData(),
          navigation.waitForSupersede().then(() => null),
        ]);
        if (!isCurrent()) {
          return;
        }
        target = {
          fileId: donor?.fileId ?? currentWhiteboardOfficeFileId,
          page: donor?.page ?? currentPage,
        };
      }

      // Hydrate from the server when no presenter is online to answer a peer sync.
      const hydrate = !!isPresenter || !controller.hasPresenterOnline();
      await controller.sync(target.fileId, target.page, { hydrate });
      if (!isCurrent()) {
        return;
      }

      applySceneToExcalidraw({ init: true });
      const elements = excalidrawAPI.getSceneElements();
      const pageInfo = resolvePageInfoFromElements(elements);
      if (isPresenter) {
        excalidrawAPI.updateScene({
          elements: addBoundaryToElements(elements, pageInfo),
        });
      }
      restoreOrScrollToBoundary(excalidrawAPI, pageInfo, target);
      if (isPresenter) {
        controller.broadcastFullState();
      }
    },
    [
      excalidrawAPI,
      isPresenter,
      controller,
      navigation,
      addBoundaryToElements,
      restoreOrScrollToBoundary,
      applySceneToExcalidraw,
    ],
  );

  // clean up during exit: drop presence from the room and clear image state.
  useEffect(() => {
    return () => {
      controller.clearLocalPresence();
      cleanProcessedImageElementsMap();
    };
  }, [controller]);

  // on mount: point the CRDT at the active page/file and apply the scene.
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }
    const timer = setTimeout(() => {
      void navigation.startBootstrap(runInitialNavigation, releaseTransitionLock);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI]);

  // Effect for page or file changes
  useEffect(() => {
    const hasFileChanged = previousFileId && currentWhiteboardOfficeFileId !== previousFileId;
    const hasPageChanged = previousPage && currentPage !== previousPage;

    if (hasFileChanged || hasPageChanged) {
      // Never dropped while a previous switch is still running: the queue keeps
      // only the newest target and supersedes the older one.
      startNavigation({ fileId: currentWhiteboardOfficeFileId, page: currentPage });
    }
  }, [currentWhiteboardOfficeFileId, previousFileId, currentPage, previousPage, startNavigation]);

  /**
   * Primary canvas callback; it receives the entire scene on every change. Local edits
   * go into the CRDT, pending images sync via the follow-up onChange once saved.
   */
  const handleCanvasChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (
        !excalidrawAPI || // API not ready
        !currentUser || // User not available
        isSwitching.current // A page/file switch is in progress
      ) {
        return;
      }

      // Presenters or unlocked users can broadcast scene changes.
      syncCanvasToCrdt(elements, appState, files);

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
    [excalidrawAPI, currentUser, isPresenter, syncCanvasToCrdt],
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
        const msg: WhiteboardPresence = {
          pointer: payload.pointer,
          button: payload.button || 'up',
          selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
          id: currentUser.userId,
          username: currentUser.name,
          avatarUrl: currentUser.metadata?.profilePic,
        };
        controller.setLocalPresence(msg);
      },
      CURSOR_SYNC_TIMEOUT,
    ),
    [canEdit, currentUser, excalidrawAPI, controller],
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
    // page switches only adjust scroll/zoom via restoreOrScrollToBoundary.
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
      ref={dropContainerRef}
      className={`excalidraw-wrapper flex-1 w-full max-w-[1280px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9 z-0 ${
        isToolbarHidden ? 'toolbar-hidden' : ''
      }`}
      role="region"
      aria-label={t('whiteboard.whiteboard-area').toString()}
    >
      {isPresenter && excalidrawAPI && (
        <>
          {isOpenManageFilesUI && (
            <ManageOfficeFilesModal
              roomId={roomId}
              excalidrawAPI={excalidrawAPI}
              onClose={() => setIsOpenManageFilesUI(false)}
              isOpen={isOpenManageFilesUI}
              showSwitchingWarning={showSwitchingWarning}
            />
          )}
          {isOpenExportPdfUI && (
            <ExportPDFModal
              excalidrawAPI={excalidrawAPI}
              onClose={() => setIsOpenExportPdfUI(false)}
              isOpen={isOpenExportPdfUI}
            />
          )}
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
          aiEnabled={canEdit}
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
                  <div className="dropdown-menu-item__text">{t('whiteboard.export-pdf-title')}</div>
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
                  onClick={() =>
                    startNavigation(
                      { fileId: currentWhiteboardOfficeFileId, page: currentPage },
                      { force: true },
                    )
                  }
                >
                  <div className="dropdown-menu-item__icon">
                    <RefreshIcon />
                  </div>
                  <div className="dropdown-menu-item__text">{t('whiteboard.force-sync')}</div>
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
                  {isToolbarHidden ? t('whiteboard.show-toolbar') : t('whiteboard.hide-toolbar')}
                </div>
              </button>
            )}
            <MainMenu.DefaultItems.Help />
            {screenWidth <= 767 && renderFooter}
          </MainMenu>
          <WhiteboardAI canEdit={canEdit} />
          {screenWidth > 767 && <Footer>{renderFooter}</Footer>}
        </Excalidraw>
      </div>
    </div>
  );
};

export default Whiteboard;
