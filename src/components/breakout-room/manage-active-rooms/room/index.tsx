import React from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { BreakoutRoom } from 'plugnmeet-protocol-js';
import clsx from 'clsx';

import EndBtn from './endBtn';
import BreakoutRoomUsers from './users';
import BreakoutRoomDuration from './duration';
import JoinBtn from './joinBtn';
import ExtendDuration from './extendDuration';
import { BreakoutRoomMessage } from '../..';
import { AiIconSVG } from '../../../../assets/Icons/AiIconSVG';

interface RoomItemProps {
  room: BreakoutRoom;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const RoomItem = ({ room, setMessage }: RoomItemProps) => {
  const { t } = useTranslation();
  // AI Agent rooms can carry a per-room custom instruction set for the assistant.
  const aiContext = room.enableAiAgent ? (room.aiAgentContext ?? '').trim() : '';
  // 1-on-1 AI rooms have a single assigned user: the learner.
  const learner = room.enableAiAgent ? room.users?.[0] : undefined;
  const learnerJoined = !!learner?.joined;

  return (
    <Disclosure as="div">
      {({ open }) => (
        <div className="bg-Gray-50 dark:bg-dark-primary rounded-xl border border-gray-300 dark:border-gray-800 overflow-hidden w-full">
          <DisclosureButton
            className={`flex items-center justify-between gap-3 w-full ps-[14px] pe-2 bg-white dark:bg-dark-secondary3 h-9 rounded-xl shadow-button-shadow dark:shadow-none transition-all duration-300 cursor-pointer ${
              open ? 'border-b border-gray-300 dark:border-gray-800' : ''
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-Gray-800 dark:text-white truncate">{room.title}</span>
            </span>
            <div className="right flex items-center gap-2">
              {room.enableAiAgent && (
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-Gray-100 dark:bg-Gray-800 text-Gray-800 dark:text-white max-w-36"
                    title={
                      learnerJoined ? t('breakout-room.user-joined') : t('breakout-room.not-joined')
                    }
                  >
                    <span
                      className={clsx(
                        'w-2 h-2 rounded-full shrink-0',
                        learnerJoined ? 'bg-Green-700' : 'bg-Red-600',
                      )}
                    />
                    <span className="truncate">
                      {learner?.name || t('breakout-room.unassigned')}
                    </span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-Blue/10 text-Blue dark:bg-Blue/20 dark:text-Blue2-50 border border-Blue/20"
                    title={
                      room.aiAgentJoined
                        ? t('breakout-room.agent-online')
                        : t('breakout-room.agent-offline')
                    }
                  >
                    <span
                      className={clsx(
                        'w-2 h-2 rounded-full shrink-0',
                        room.aiAgentJoined ? 'bg-Green-700' : 'bg-Red-600',
                      )}
                    />
                    <AiIconSVG classes="w-3.5 h-3.5 shrink-0" />
                    <span>{t('breakout-room.ai-session-badge')}</span>
                  </span>
                </div>
              )}
              <div className="wrap text-sm font-semibold text-Gray-950 dark:text-white">
                {room.started ? (
                  <BreakoutRoomDuration
                    duration={BigInt(room.duration)}
                    created={BigInt(room.created)}
                  />
                ) : (
                  t('breakout-room.not-started')
                )}
              </div>
              <div className={clsx('transition-transform duration-200', open && 'rotate-180')}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="17"
                  viewBox="0 0 16 17"
                  fill="none"
                >
                  <path d="M12 6.5L8 10.5L4 6.5" fill="#7493B3" />
                  <path
                    d="M12 6.5L8 10.5L4 6.5H12Z"
                    stroke="#7493B3"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </DisclosureButton>

          {/* `transition` keeps the panel mounted until the collapse finishes;
              the grid rows trick animates height without knowing the content size. */}
          <DisclosurePanel
            transition
            className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-200 ease-out data-closed:grid-rows-[0fr] data-closed:opacity-0"
          >
            <div className="overflow-hidden">
              <div className="wrap relative rounded-xl overflow-auto">
                <div className="inner p-5">
                  <div className="row flex flex-wrap items-center justify-between mb-4">
                    <ExtendDuration breakoutRoomId={room.id} setMessage={setMessage} />
                    <div className="row flex mb-2">
                      <JoinBtn breakoutRoomId={room.id} setMessage={setMessage} />
                      <EndBtn breakoutRoomId={room.id} setMessage={setMessage} />
                    </div>
                  </div>
                  {aiContext && (
                    <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-Blue/5 dark:bg-Blue/10 border border-Blue/20">
                      <AiIconSVG classes="w-3.5 h-3.5 shrink-0 mt-0.5 text-Blue" />
                      <p className="text-xs italic break-words whitespace-pre-wrap text-Gray-700 dark:text-Gray-300">
                        {aiContext}
                      </p>
                    </div>
                  )}
                  <BreakoutRoomUsers
                    users={room.users}
                    breakoutRoomId={room.id}
                    enableAiAgent={room.enableAiAgent}
                    aiAgentJoined={room.aiAgentJoined}
                    setMessage={setMessage}
                  />
                </div>
              </div>
            </div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};

export default RoomItem;
