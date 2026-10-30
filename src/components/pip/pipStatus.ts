/** Largest count shown before the badge switches to `99+`. */
const MAX_BADGE_COUNT = 99;

export type PipStatusKind = 'chat' | 'raised-hand' | 'notification';

/** Omitted counts count as zero, so a view can supply only the indicators it shows. */
export interface IPipStatusCounts {
  chatUnread?: number;
  raisedHands?: number;
  notifications?: number;
}

export interface IPipStatusItem {
  kind: PipStatusKind;
  /** Raw count, used for the accessible label. */
  count: number;
  /** Compact badge text, e.g. `3` or `99+`. */
  text: string;
}

export const formatPipStatusCount = (count: number): string =>
  count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);

/** Returns only the indicators with something to report, in display order. */
export const getPipStatusItems = (counts: IPipStatusCounts): IPipStatusItem[] => {
  const items: Omit<IPipStatusItem, 'text'>[] = [
    { kind: 'chat', count: counts.chatUnread ?? 0 },
    { kind: 'raised-hand', count: counts.raisedHands ?? 0 },
    { kind: 'notification', count: counts.notifications ?? 0 },
  ];

  return items
    .filter((item) => item.count > 0)
    .map((item) => ({
      kind: item.kind,
      count: item.count,
      text: formatPipStatusCount(item.count),
    }));
};
