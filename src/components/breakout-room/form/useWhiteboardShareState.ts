import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { create } from '@bufbuild/protobuf';
import { WhiteboardShare, WhiteboardShareSchema } from 'plugnmeet-protocol-js';

import { useAppSelector } from '../../../store';
import { DEFAULT_WHITEBOARD_OFFICE_FILE_ID } from '../../../store/slices/interfaces/whiteboard';
import { getWhiteboardController } from '../../whiteboard/collab';

/**
 * Read whether the built-in "default" blank board currently has content worth
 * sharing. Cheap one-time check: the live controller snapshot must be mounted on
 * the default board with a non-empty element set. Returns false when the
 * whiteboard was never opened (no snapshot/doc) or the user is on another file.
 */
const defaultBoardHasContent = (): boolean => {
  const controller = getWhiteboardController();
  const snapshot = controller?.getSnapshot();
  return (
    !!snapshot &&
    snapshot.fileId === DEFAULT_WHITEBOARD_OFFICE_FILE_ID &&
    !!snapshot.doc &&
    (controller?.getElements().length ?? 0) > 0
  );
};

export const useWhiteboardShareState = () => {
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );
  const whiteboardTotalPages = useAppSelector(
    (state) => state.whiteboard.totalPages,
  );
  const whiteboardCurrentPage = useAppSelector(
    (state) => state.whiteboard.currentPage,
  );

  // 2a: the built-in "default" board (which may carry annotations stored as
  // default_N session-data keys) is now a valid share candidate like any office
  // file. Only an EMPTY file id means "no file" (defensive case handled in the
  // UI with the share-whiteboard-no-file hint + disabled checkbox).
  const hasWhiteboardFile = currentWhiteboardOfficeFileId !== '';

  // Content sharing cannot work under self-insert E2EE: each participant types
  // their own secret locally and it is cleared immediately after connect, so the
  // parent's metadata never carries the operative secret and child participants
  // re-insert their own. The UI disables the share toggles in this mode.
  const contentShareDisabled = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures
        ?.endToEndEncryptionFeatures?.isEnabled &&
      !!state.session.currentRoom.metadata?.roomFeatures
        ?.endToEndEncryptionFeatures?.enabledSelfInsertEncryptionKey,
  );

  const allWhiteboardPages = useMemo(
    () => Array.from({ length: whiteboardTotalPages }, (_, i) => i + 1),
    [whiteboardTotalPages],
  );

  // Default the checkbox ON when the active board has content to share. For a
  // real office file that is always the case; for the "default" board we do a
  // cheap live check. Computed once at mount — later manual toggles win.
  const initialShareWhiteboard = useMemo(() => {
    if (contentShareDisabled) {
      return false;
    }
    if (!hasWhiteboardFile) {
      return false;
    }
    if (currentWhiteboardOfficeFileId !== DEFAULT_WHITEBOARD_OFFICE_FILE_ID) {
      return true;
    }
    return defaultBoardHasContent();
    // One-time read at mount; intentional empty deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentShareDisabled]);

  const [shareWhiteboard, setShareWhiteboard] = useState<boolean>(
    initialShareWhiteboard,
  );
  const [selectedWhiteboardPages, setSelectedWhiteboardPages] = useState<
    number[]
  >(() => Array.from({ length: whiteboardTotalPages }, (_, i) => i + 1));

  const toggleWhiteboardPage = useCallback((page: number) => {
    setSelectedWhiteboardPages((prev) =>
      prev.includes(page)
        ? prev.filter((p) => p !== page)
        : [...prev, page].sort((a, b) => a - b),
    );
  }, []);

  const whiteboardPagesSelected =
    shareWhiteboard && hasWhiteboardFile && !contentShareDisabled;

  // Track previous file id / page count so selections re-sync only when either
  // actually changes (without clobbering user-made selections while unchanged).
  const prevWhiteboardFileId = useRef(currentWhiteboardOfficeFileId);
  const prevWhiteboardTotalPages = useRef(whiteboardTotalPages);

  useEffect(() => {
    const fileIdChanged =
      prevWhiteboardFileId.current !== currentWhiteboardOfficeFileId;
    const pagesChanged =
      prevWhiteboardTotalPages.current !== whiteboardTotalPages;

    if (fileIdChanged || pagesChanged) {
      setSelectedWhiteboardPages(
        Array.from({ length: whiteboardTotalPages }, (_, i) => i + 1),
      );
    }
    if (fileIdChanged) {
      setShareWhiteboard(hasWhiteboardFile && !contentShareDisabled);
    }

    prevWhiteboardFileId.current = currentWhiteboardOfficeFileId;
    prevWhiteboardTotalPages.current = whiteboardTotalPages;
  }, [
    currentWhiteboardOfficeFileId,
    whiteboardTotalPages,
    hasWhiteboardFile,
    contentShareDisabled,
  ]);

  return {
    currentWhiteboardOfficeFileId,
    whiteboardTotalPages,
    whiteboardCurrentPage,
    hasWhiteboardFile,
    allWhiteboardPages,
    shareWhiteboard,
    setShareWhiteboard,
    selectedWhiteboardPages,
    setSelectedWhiteboardPages,
    toggleWhiteboardPage,
    whiteboardPagesSelected,
    contentShareDisabled,
  };
};

/** Build the whiteboardShare request fragment, or null when not sharing. */
export const buildWhiteboardShare = (params: {
  enabled: boolean;
  fileId: string;
  pages: number[];
  currentPage: number;
}): WhiteboardShare | null => {
  if (!params.enabled || params.pages.length === 0) {
    return null;
  }
  return create(WhiteboardShareSchema, {
    fileId: params.fileId,
    pages: [...params.pages].sort((a, b) => a - b),
    currentPage: params.currentPage,
  });
};
