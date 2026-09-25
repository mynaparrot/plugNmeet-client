import React, { useEffect, useState } from 'react';
import MessageActions from './messageActions';
import { IMessageActionsProps } from './types';

// Mounts the heavy Menu/Modal chrome after idle so the list paint isn't blocked.
const DeferredMessageActions = (props: IMessageActionsProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const idle = typeof window.requestIdleCallback === 'function';
    if (idle) {
      const id = window.requestIdleCallback(() => setMounted(true), {
        timeout: 300,
      });
      return () => window.cancelIdleCallback(id);
    }

    // Safari fallback.
    const timer = window.setTimeout(() => setMounted(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) {
    // Reserves the ••• button footprint.
    return <div aria-hidden="true" className="h-6 w-6 shrink-0" />;
  }

  return <MessageActions {...props} />;
};

export default DeferredMessageActions;
