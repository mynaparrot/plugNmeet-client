import i18n from '../../../helpers/i18n';
import type { IParticipant } from '../../../store/slices/interfaces/participant';

// Same ids as isUserRecorder() in helpers/utils; kept local so this builder
// stays free of store imports.
const BOT_USER_IDS = new Set(['RECORDER_BOT', 'RTMP_BOT']);

const ROLE_KEYS = {
  admin: 'export-hub.participants-role-admin',
  presenter: 'export-hub.participants-role-presenter',
  participant: 'export-hub.participants-role-participant',
} as const;

type Role = keyof typeof ROLE_KEYS;

const roleOf = (participant: IParticipant): Role => {
  if (participant.metadata?.isAdmin) {
    return 'admin';
  }
  if (participant.metadata?.isPresenter) {
    return 'presenter';
  }
  return 'participant';
};

/**
 * Current roster, including hidden participants: no bots and no users still
 * waiting for approval.
 */
export const isExportableParticipant = (participant: IParticipant): boolean =>
  !participant.metadata?.waitForApproval && !BOT_USER_IDS.has(participant.userId);

export const countExportableParticipants = (participants: IParticipant[]): number =>
  participants.filter(isExportableParticipant).length;

// Spreadsheet apps may evaluate a leading =, +, -, @, tab or CR as a formula,
// and some trim leading spaces first. Names and user ids are user-controlled,
// so neutralise them before quoting (RFC 4180).
const isFormulaLike = (value: string): boolean =>
  /^\s*[=+\-@]/.test(value) || /^[\t\r]/.test(value);

const escapeCsvField = (value: string): string => {
  const safe = isFormulaLike(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const toIsoTimestamp = (joinedAt: number): string => {
  const ms = Number(joinedAt);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : '';
};

export const buildParticipantsCsv = (participants: IParticipant[]): string => {
  const header = [
    i18n.t('export-hub.participants-csv-name'),
    i18n.t('export-hub.participants-csv-role'),
    i18n.t('export-hub.participants-csv-joined-at'),
    i18n.t('export-hub.participants-csv-online'),
    i18n.t('export-hub.participants-csv-user-id'),
  ]
    .map(escapeCsvField)
    .join(',');

  const rows = participants
    .filter(isExportableParticipant)
    .map((participant) =>
      [
        participant.name ?? '',
        i18n.t(ROLE_KEYS[roleOf(participant)]),
        toIsoTimestamp(participant.joinedAt),
        i18n.t(
          participant.isOnline
            ? 'export-hub.participants-online-yes'
            : 'export-hub.participants-online-no',
        ),
        participant.userId ?? '',
      ]
        .map(escapeCsvField)
        .join(','),
    );

  // UTF-8 BOM so Excel renders non-ASCII names correctly.
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
};
