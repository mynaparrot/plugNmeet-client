/** Exponential backoff delay for `attempt`, capped at `max`. */
export const backoffDelay = (base: number, max: number, attempt: number): number =>
  Math.min(max, base * 2 ** attempt);
