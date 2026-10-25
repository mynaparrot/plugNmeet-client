import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../helpers/i18n', async () => {
  const { createTestI18n } = await import('./i18nTestUtils');
  return { default: await createTestI18n() };
});

import i18n from '../../../../helpers/i18n';
import { buildParticipantsCsv, countExportableParticipants } from '../participantsCsv';
import { exportHubT } from './i18nTestUtils';

const t = (key: string) => exportHubT(i18n, key);
const HEADER = [
  t('participants-csv-name'),
  t('participants-csv-role'),
  t('participants-csv-joined-at'),
  t('participants-csv-online'),
  t('participants-csv-user-id'),
].join(',');

const participant = (overrides: Record<string, unknown> = {}) =>
  ({
    userId: 'u1',
    sid: 'sid-1',
    name: 'Alice',
    visibility: 'visible',
    joinedAt: 1700000000000,
    isOnline: true,
    metadata: { isAdmin: false, isPresenter: false, waitForApproval: false },
    ...overrides,
  }) as never;

describe('buildParticipantsCsv', () => {
  it('always writes the translated header row', () => {
    expect(buildParticipantsCsv([]).trim()).toBe(HEADER);
  });

  it('writes name, role, ISO join time, online flag and user id', () => {
    const csv = buildParticipantsCsv([
      participant({
        metadata: { isAdmin: true, isPresenter: true, waitForApproval: false },
        isOnline: false,
      }),
    ]);

    expect(csv.split('\r\n')[1]).toBe(
      [
        'Alice',
        t('participants-role-admin'),
        '2023-11-14T22:13:20.000Z',
        t('participants-online-no'),
        'u1',
      ].join(','),
    );
  });

  it('maps presenter and participant roles', () => {
    const csv = buildParticipantsCsv([
      participant({ userId: 'u2', name: 'Bob', metadata: { isPresenter: true } }),
      participant({ userId: 'u3', name: 'Carol', metadata: {} }),
    ]);

    expect(csv).toContain(`Bob,${t('participants-role-presenter')},`);
    expect(csv).toContain(`Carol,${t('participants-role-participant')},`);
  });

  it('excludes bots and waiting-room users', () => {
    const csv = buildParticipantsCsv([
      participant({ userId: 'RECORDER_BOT', name: 'Recorder' }),
      participant({ userId: 'RTMP_BOT', name: 'RTMP' }),
      participant({ userId: 'waiting', name: 'Waiting', metadata: { waitForApproval: true } }),
    ]);

    expect(csv.trim()).toBe(HEADER);
  });

  it('includes hidden participants', () => {
    const csv = buildParticipantsCsv([
      participant({ userId: 'hidden', name: 'Hidden', visibility: 'hidden' }),
    ]);

    expect(csv.split('\r\n')[1]).toBe(
      `Hidden,${t('participants-role-participant')},2023-11-14T22:13:20.000Z,${t('participants-online-yes')},hidden`,
    );
  });

  it('escapes separators and quotes', () => {
    const csv = buildParticipantsCsv([participant({ name: 'Doe, "Jane"' })]);

    expect(csv.split('\r\n')[1]).toBe(
      `"Doe, ""Jane""",${t('participants-role-participant')},2023-11-14T22:13:20.000Z,${t('participants-online-yes')},u1`,
    );
  });

  it('neutralises spreadsheet formula injection in names', () => {
    const csv = buildParticipantsCsv([
      participant({ name: '=1+1' }),
      participant({ userId: 'u2', name: '+SUM(A1)' }),
      participant({ userId: 'u3', name: '-2+3' }),
      participant({ userId: 'u4', name: '@SUM(A1)' }),
    ]);
    const firstColumn = csv
      .split('\r\n')
      .slice(1, -1)
      .map((row) => row.split(',')[0]);

    expect(firstColumn).toEqual(["'=1+1", "'+SUM(A1)", "'-2+3", "'@SUM(A1)"]);
  });

  it('neutralises tab and CR formula prefixes', () => {
    const csv = buildParticipantsCsv([
      participant({ name: '\t=1+1' }),
      participant({ userId: 'u2', name: '\r=1+1' }),
    ]);

    expect(csv.split('\r\n')[1]).toBe(
      `'\t=1+1,${t('participants-role-participant')},2023-11-14T22:13:20.000Z,${t('participants-online-yes')},u1`,
    );
    expect(csv).toContain('"\'\r=1+1"');
  });

  it('neutralises formula triggers hidden behind leading whitespace', () => {
    const csv = buildParticipantsCsv([
      participant({ name: ' =1+1' }),
      participant({ userId: 'u2', name: '  +SUM(A1)' }),
      participant({ userId: 'u3', name: ' \t@SUM(A1)' }),
    ]);
    const firstColumn = csv
      .split('\r\n')
      .slice(1, -1)
      .map((row) => row.split(',')[0]);

    expect(firstColumn).toEqual(["' =1+1", "'  +SUM(A1)", "' \t@SUM(A1)"]);
  });

  it('quotes formula-like names that also contain separators', () => {
    const csv = buildParticipantsCsv([participant({ name: '=HYPERLINK("http://x","y")' })]);

    expect(csv.split('\r\n')[1]).toContain('"\'=HYPERLINK(""http://x"",""y"")"');
  });

  it('starts with a UTF-8 BOM and preserves non-ASCII names', () => {
    const csv = buildParticipantsCsv([participant({ name: '张伟, Zoë' })]);

    expect(Array.from(new TextEncoder().encode(csv)).slice(0, 3)).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv).toContain('"张伟, Zoë"');
    expect(
      new TextDecoder('utf-8', { ignoreBOM: true }).decode(new TextEncoder().encode(csv)),
    ).toBe(csv);
  });

  it('escapes separators, quotes and formula triggers in user ids', () => {
    const csv = buildParticipantsCsv([
      participant({ userId: '=1+1' }),
      participant({ userId: '=cmd|"x",y', name: 'Bob' }),
    ]);
    const rows = csv.split('\r\n');

    expect(rows[1].split(',').pop()).toBe("'=1+1");
    expect(rows[2]).toBe(
      `Bob,${t('participants-role-participant')},2023-11-14T22:13:20.000Z,${t(
        'participants-online-yes',
      )},"'=cmd|""x"",y"`,
    );
  });

  it('writes the user id but not the session id or metadata', () => {
    const csv = buildParticipantsCsv([participant()]);

    expect(csv.split('\r\n')[1].endsWith(',u1')).toBe(true);
    expect(csv).not.toContain('sid-1');
  });
});

describe('countExportableParticipants', () => {
  it('counts only exportable participants', () => {
    expect(
      countExportableParticipants([
        participant(),
        participant({ userId: 'hidden', visibility: 'hidden' }),
        participant({ userId: 'RTMP_BOT' }),
        participant({ userId: 'waiting', metadata: { waitForApproval: true } }),
      ]),
    ).toBe(2);
  });
});
