import React from 'react';
import ReactDOMServer from 'react-dom/server';

import i18n from '../../helpers/i18n';
import { getNatsConn } from '../../helpers/nats';
import { store } from '../../store';
import { selectVisibleParticipants } from '../../store/slices/participantSlice';
import { IVisibleParticipantInfo } from '../../store/slices/interfaces/participant';

/**
 * Uniform random index in [0, maxExclusive) from crypto.getRandomValues.
 * Rejection sampling avoids the modulo bias of `value % maxExclusive`.
 */
export const randomIndexBelow = (maxExclusive: number): number => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive integer');
  }

  // Largest multiple of maxExclusive that still fits in the 32-bit range.
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let value = 0;

  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);

  return value % maxExclusive;
};

// Same list semantics as the panel (bots/empty names dropped, no
// wait-for-approval users), minus the admin running the draw.
export const eligibleParticipants = (excludeUserId?: string): IVisibleParticipantInfo[] =>
  selectVisibleParticipants(store.getState(), true, '', true, excludeUserId).filter(
    (p) => !p.waitForApproval && p.userId !== excludeUserId,
  );

// Interpolated in place of {{name}} so the template keeps its own wording, then
// dropped: the name gets its own line instead of sitting inside the sentence.
const NAME_SLOT = '__pickerName__';

// Rendered through React so participant names can never inject markup into chat.
// A plain public message styled like the poll result card, so it stays subtle:
// the localized text on the first line, the bold name alone on the second.
export const announceSelection = async (name: string) => {
  const conn = getNatsConn();
  if (!conn) {
    throw new Error('NATS connection is not available');
  }

  const template = i18n.t('left-panel.picker.announcement', { name: NAME_SLOT });
  const label = template.split(NAME_SLOT).join(' ').replace(/\s+/g, ' ').trim();

  const elm = ReactDOMServer.renderToString(
    React.createElement(
      'span',
      { className: 'block' },
      label,
      React.createElement('strong', { className: 'block font-bold' }, name),
    ),
  );
  await conn.sendChatMsg('public', elm);
};
