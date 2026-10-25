import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../helpers/i18n', async () => {
  const { createTestI18n } = await import('./i18nTestUtils');
  return { default: await createTestI18n() };
});

import i18n from '../../../../helpers/i18n';
import { buildPublicChatTxt, countExportablePublicMessages, htmlToPlainText } from '../chatExport';
import { exportHubT } from './i18nTestUtils';

const t = (key: string, options?: Record<string, unknown>) => exportHubT(i18n, key, options);

const message = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'm1',
    fromUserId: 'u1',
    fromName: 'Alice',
    toUserId: '',
    message: 'Hello',
    isPrivate: false,
    sentAt: 1700000000000 as unknown as bigint,
    ...overrides,
  }) as never;

describe('htmlToPlainText', () => {
  it('flattens block level markup into lines', () => {
    expect(htmlToPlainText('<p>one</p><p>two<br/>three</p>')).toBe('one\ntwo\nthree');
  });

  it('keeps list items readable', () => {
    expect(htmlToPlainText('<ul><li>first</li><li>second</li></ul>')).toBe('- first\n- second');
  });

  it('decodes entities and strips inline tags', () => {
    expect(htmlToPlainText('<p><strong>a</strong> &amp; b&nbsp;c</p>')).toBe('a & b c');
  });

  it('returns an empty string for empty input', () => {
    expect(htmlToPlainText('')).toBe('');
  });
});

describe('countExportablePublicMessages', () => {
  it('keeps only plain user messages', () => {
    const messages = [
      message(),
      message({ id: 'm2', isPrivate: true }),
      message({ id: 'm3', fromUserId: 'system' }),
      message({ id: 'system:welcome', fromUserId: 'system' }),
      message({ id: 'm4', meta: { isDeleted: true } }),
    ];
    expect(countExportablePublicMessages(messages)).toBe(1);
  });
});

describe('buildPublicChatTxt', () => {
  it('writes a header, timestamp, sender and plain text body', () => {
    const txt = buildPublicChatTxt([message()], new Date('2024-01-01T00:00:00.000Z'));

    expect(txt).toContain(t('exported-at', { timestamp: '2024-01-01T00:00:00.000Z' }));
    expect(txt).toContain('[2023-11-14T22:13:20.000Z] Alice: Hello');
  });

  it('indents multi-line message bodies', () => {
    const txt = buildPublicChatTxt([message({ message: '<p>line one</p><p>line two</p>' })]);

    expect(txt).toContain('Alice: line one\n  line two');
  });

  it('omits private, system, welcome and deleted messages', () => {
    const txt = buildPublicChatTxt([
      message({ id: 'keep', message: 'keep me' }),
      message({ id: 'private', message: 'private one', isPrivate: true }),
      message({ id: 'system', message: 'system one', fromUserId: 'system' }),
      message({ id: 'system:welcome', message: 'welcome', fromUserId: 'system' }),
      message({ id: 'deleted', message: 'deleted one', meta: { isDeleted: true } }),
    ]);

    expect(txt).toContain('keep me');
    expect(txt).not.toContain('private one');
    expect(txt).not.toContain('system one');
    expect(txt).not.toContain('welcome');
    expect(txt).not.toContain('deleted one');
  });

  it('marks an empty export', () => {
    expect(buildPublicChatTxt([])).toContain(t('chat-export-empty'));
  });

  it('resolves every exported label through the translations', () => {
    const txt = buildPublicChatTxt(
      [message({ fromName: '', sentAt: 0 as unknown as bigint, message: '<p></p>' })],
      new Date('2024-01-01T00:00:00.000Z'),
    );

    // Missing keys would surface as their dotted key path in the file.
    expect(txt).not.toContain('export-hub.');
    expect(txt).toContain(t('chat-export-unknown-sender'));
    expect(txt).toContain(t('chat-export-unknown-time'));
    expect(txt).toContain(t('chat-export-empty-message'));
  });
});
