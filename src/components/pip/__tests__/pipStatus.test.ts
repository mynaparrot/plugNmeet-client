import { describe, expect, it } from 'vitest';

import { formatPipStatusCount, getPipStatusItems } from '../pipStatus';

describe('formatPipStatusCount', () => {
  it('keeps counts up to 99 as plain numbers', () => {
    expect(formatPipStatusCount(1)).toBe('1');
    expect(formatPipStatusCount(99)).toBe('99');
  });

  it('caps larger counts', () => {
    expect(formatPipStatusCount(100)).toBe('99+');
    expect(formatPipStatusCount(1234)).toBe('99+');
  });
});

describe('getPipStatusItems', () => {
  it('hides every indicator while all counts are zero', () => {
    expect(getPipStatusItems({ chatUnread: 0, raisedHands: 0, notifications: 0 })).toEqual([]);
  });

  it('shows only non-zero indicators in a stable order', () => {
    const items = getPipStatusItems({ chatUnread: 2, raisedHands: 0, notifications: 7 });

    expect(items.map((item) => [item.kind, item.count, item.text])).toEqual([
      ['chat', 2, '2'],
      ['notification', 7, '7'],
    ]);
  });

  it('caps each badge independently', () => {
    const items = getPipStatusItems({ chatUnread: 150, raisedHands: 1, notifications: 0 });

    expect(items).toEqual([
      { kind: 'chat', count: 150, text: '99+' },
      { kind: 'raised-hand', count: 1, text: '1' },
    ]);
  });
});
