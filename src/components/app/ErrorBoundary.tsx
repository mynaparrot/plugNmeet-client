import React, { Component, ErrorInfo, ReactNode } from 'react';

import i18n from '../../helpers/i18n';

interface IErrorBoundaryProps {
  children: ReactNode;
  /** Remount children once after a crash; give up on repeated failures. */
  autoRemount?: boolean;
}

interface IErrorBoundaryState {
  hasError: boolean;
  remountKey: number;
  /** True while a remount is scheduled; the fallback is hidden meanwhile. */
  remountPending: boolean;
}

const REMOUNT_DELAY_MS = 1000;
const REMOUNT_WINDOW_MS = 10_000;

class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  state: IErrorBoundaryState = { hasError: false, remountKey: 0, remountPending: false };

  private remountTimer?: ReturnType<typeof setTimeout>;
  private lastRemountAt = 0;

  static getDerivedStateFromError(): Partial<IErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[error-boundary]', error, info.componentStack);

    if (!this.props.autoRemount) {
      return;
    }

    // A crash right after a remount means the tree cannot recover on its own.
    if (Date.now() - this.lastRemountAt < REMOUNT_WINDOW_MS) {
      return;
    }

    clearTimeout(this.remountTimer);
    this.remountTimer = setTimeout(() => {
      this.lastRemountAt = Date.now();
      this.setState((prev) => ({
        hasError: false,
        remountKey: prev.remountKey + 1,
        remountPending: false,
      }));
    }, REMOUNT_DELAY_MS);
    this.setState({ remountPending: true });
  }

  componentWillUnmount() {
    clearTimeout(this.remountTimer);
  }

  render() {
    // A remount is scheduled: show nothing instead of flashing the error UI.
    if (this.state.remountPending) {
      return null;
    }

    if (this.state.hasError) {
      return (
        <div className="h-full min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center bg-Gray-50 dark:bg-dark-secondary">
          <h2 className="text-xl 3xl:text-2xl font-semibold text-Gray-950 dark:text-white">
            {i18n.t('app.error-boundary-title', { defaultValue: 'Something went wrong' })}
          </h2>
          <p className="text-sm 3xl:text-base leading-5 text-Gray-950/90 dark:text-dark-text">
            {i18n.t('app.error-boundary-text', {
              defaultValue: 'An unexpected error occurred. Reload the page to continue.',
            })}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="primary-button h-10 px-6 cursor-pointer text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow"
          >
            {i18n.t('app.reload', { defaultValue: 'Reload' })}
          </button>
        </div>
      );
    }

    return <React.Fragment key={this.state.remountKey}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary;
