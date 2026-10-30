import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Camera } from '../../assets/Icons/Camera';
import { ChatIconSVG } from '../../assets/Icons/ChatIconSVG';
import { HandsIconSVG } from '../../assets/Icons/HandsIconSVG';
import { Microphone } from '../../assets/Icons/Microphone';
import { NotifyIconSVG } from '../../assets/Icons/NotifyIconSVG';
import { useAppSelector } from '../../store';
import { selectRaisedHandsQueue } from '../../store/slices/participantSlice';
import useActiveSpeakers from '../active-speakers/useActiveSpeakers';
import { PipContent, usePip } from './pipProvider';
import { getPipStatusItems, PipStatusKind } from './pipStatus';

const MODES: { mode: PipContent; icon: React.ReactNode }[] = [
  { mode: 'chat', icon: <ChatIconSVG /> },
  { mode: 'webcam', icon: <Camera classes="" /> },
];

const STATUS_ICONS: Record<PipStatusKind, React.ReactNode> = {
  chat: <ChatIconSVG />,
  'raised-hand': <HandsIconSVG classes="" />,
  notification: <NotifyIconSVG classes="" />,
};

/**
 * Centered header row of the PiP window: view switch, first active speaker and
 * the activity badges. It hides the unread-chat badge in the chat view, since
 * the reader is already looking at the messages. It is rendered by the always-mounted chat owner, so it
 * stays available in both views even when the webcam strip unmounts, which is
 * also the only way back to chat from an otherwise blank webcam window.
 */
const PipHeader = () => {
  const { t } = useTranslation();
  const { content, openPip } = usePip();

  const currentSpeaker = useActiveSpeakers()[0];

  const chatUnread = useAppSelector((state) => state.bottomIconsActivity.totalUnreadChatMsgs);
  const raisedHands = useAppSelector((state) => selectRaisedHandsQueue(state).count);
  const unreadNotifications = useAppSelector(
    (state) => state.roomSettings.unreadNotificationsCount,
  );

  // Unread chat is deliberately left out of the chat view: the reader is
  // already looking at the messages.
  const statusItems = useMemo(
    () =>
      getPipStatusItems({
        chatUnread: content === 'chat' ? 0 : chatUnread,
        raisedHands,
        notifications: unreadNotifications,
      }),
    [content, chatUnread, raisedHands, unreadNotifications],
  );

  return (
    <div className="pip-header">
      <div
        className="pip-mode-switcher"
        role="group"
        aria-label={t('pip.switcher.label').toString()}
      >
        {MODES.map(({ mode, icon }) => {
          const label = t(`pip.switcher.${mode}`).toString();

          return (
            <button
              key={mode}
              type="button"
              className="pip-mode-button"
              aria-label={label}
              aria-pressed={content === mode}
              title={label}
              onClick={() => openPip(mode)}
            >
              {icon}
            </button>
          );
        })}
      </div>
      {currentSpeaker && (
        <div
          className="pip-speaking-indicator"
          role="status"
          aria-live="polite"
          aria-label={t('pip.speaking', { name: currentSpeaker.name }).toString()}
        >
          <Microphone classes="pip-speaking-icon" />
          <span className="pip-speaking-name" dir="auto">
            {currentSpeaker.name}
          </span>
        </div>
      )}
      {statusItems.length > 0 && (
        <div className="pip-status" role="status" aria-live="polite">
          {statusItems.map((item) => (
            <span
              key={item.kind}
              className="pip-status-item"
              role="img"
              aria-label={`${t(`pip.status.${item.kind}`)}: ${item.count}`}
            >
              {STATUS_ICONS[item.kind]}
              <span aria-hidden="true">{item.text}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PipHeader;
