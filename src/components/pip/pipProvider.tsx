import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DocumentPictureInPictureWindow,
  injectPipStyles,
  PIP_WINDOW_HEIGHT,
  PIP_WINDOW_WIDTH,
} from './pipUtils';

export type PipContent = 'webcam' | 'chat';

interface IPipContext {
  /** The detached PiP window, or null while it is closed. */
  pipWindow: Window | null;
  /** What the PiP window is showing right now. */
  content: PipContent | null;
  isSupported: boolean;
  /** Opens the PiP window, or switches/focuses the already open one. */
  openPip: (content: PipContent) => void;
  /** Closes the PiP window only when it is showing the given content. */
  releasePip: (content: PipContent) => void;
}

const PipContext = createContext<IPipContext | null>(null);

const isDocumentPipSupported = () =>
  typeof window !== 'undefined' &&
  typeof (window as DocumentPictureInPictureWindow).documentPictureInPicture?.requestWindow ===
    'function';

export const usePip = (): IPipContext => {
  const ctx = useContext(PipContext);
  if (!ctx) {
    throw new Error('usePip must be used inside PipProvider');
  }
  return ctx;
};

/**
 * Owns the single Document Picture-in-Picture window of the tab. A tab can only
 * have one such window, so every view (webcam strip, public chat) shares it and
 * only decides what is rendered inside via createPortal.
 */
export const PipProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSupported] = useState(isDocumentPipSupported);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [content, setContent] = useState<PipContent | null>(null);

  const pipWindowRef = useRef<Window | null>(null);
  const contentRef = useRef<PipContent | null>(null);
  const isMountedRef = useRef(false);
  const isOpeningRef = useRef(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
      pipWindowRef.current = null;
    };
  }, []);

  const resetWindow = useCallback(() => {
    pipWindowRef.current = null;

    if (isMountedRef.current) {
      setPipWindow(null);
      setContent(null);
    }
  }, []);

  const releasePip = useCallback(
    (target: PipContent) => {
      if (contentRef.current !== target) {
        return;
      }

      const win = pipWindowRef.current;
      if (win && !win.closed) {
        win.close();
      }
      resetWindow();
    },
    [resetWindow],
  );

  const openPip = useCallback(
    (next: PipContent) => {
      const existing = pipWindowRef.current;
      if (existing && !existing.closed) {
        setContent(next);
        existing.focus();
        return;
      }

      const documentPictureInPicture = (window as DocumentPictureInPictureWindow)
        .documentPictureInPicture;
      if (typeof documentPictureInPicture?.requestWindow !== 'function') {
        return;
      }

      // A second requestWindow() while the first is pending is rejected by the
      // browser, so repeated clicks are ignored until this one settles.
      if (isOpeningRef.current) {
        return;
      }
      isOpeningRef.current = true;

      // requestWindow() needs transient user activation, so it is called
      // synchronously here instead of from an effect.
      documentPictureInPicture
        .requestWindow({ width: PIP_WINDOW_WIDTH, height: PIP_WINDOW_HEIGHT })
        .then((win) => {
          pipWindowRef.current = win;
          injectPipStyles(win);

          win.addEventListener('pagehide', resetWindow, { once: true });

          if (!isMountedRef.current) {
            win.close();
            return;
          }

          setPipWindow(win);
          setContent(next);

          // Explicitly pull focus back after OS/browser focus shifts.
          setTimeout(() => {
            if (!win.closed) {
              win.focus();
            }
          }, 0);
        })
        .catch((error) => {
          console.error('Failed to open PiP window:', error);
          resetWindow();
        })
        .finally(() => {
          isOpeningRef.current = false;
        });
    },
    [resetWindow],
  );

  const value = useMemo<IPipContext>(
    () => ({ pipWindow, content, isSupported, openPip, releasePip }),
    [pipWindow, content, isSupported, openPip, releasePip],
  );

  return <PipContext.Provider value={value}>{children}</PipContext.Provider>;
};
