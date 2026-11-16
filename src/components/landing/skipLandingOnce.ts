/**
 * One-shot flag for room switches (breakout room / back to main room): the next
 * page load connects straight away instead of showing the landing page again.
 */
export const SKIP_LANDING_ONCE_KEY = 'pnm_skip_landing_once';

export const setSkipLandingOnce = () => sessionStorage.setItem(SKIP_LANDING_ONCE_KEY, '1');

/** Reads the flag without consuming it (the value is removed by consumeSkipLandingOnce). */
export const hasSkipLandingOnce = (): boolean =>
  sessionStorage.getItem(SKIP_LANDING_ONCE_KEY) === '1';

export const consumeSkipLandingOnce = (): boolean => {
  const skip = hasSkipLandingOnce();
  if (skip) {
    sessionStorage.removeItem(SKIP_LANDING_ONCE_KEY);
  }
  return skip;
};
