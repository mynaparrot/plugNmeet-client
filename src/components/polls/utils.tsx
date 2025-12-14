import React, { ReactElement } from 'react';
import { chunk } from 'es-toolkit';
import ReactDOMServer from 'react-dom/server';

import { getNatsConn } from '../../helpers/nats';
import i18n from '../../helpers/i18n';
import { generateAvatarInitial } from '../../helpers/utils';

export interface PollDataWithOption {
  pollId: string;
  question: string;
  options: {
    [key: string]: PollDataOption;
  };
  totalRespondents: number;
  allRespondents: Respondents[];
}

interface PollDataOption {
  id: number;
  text: string;
  responsesPercentage: number;
  respondents: Respondents[];
}

export interface Respondents {
  userId: string;
  name: string;
}

const RespondentItem = ({ user }: { user: Respondents }) => {
  const initials = generateAvatarInitial(user.name);

  return (
    <p
      className="text-xs w-[156.5px] font-medium text-Gray-800 dark:text-white flex items-center gap-1 px-[14px]"
      key={user.userId}
    >
      <span className="w-[18px] h-[18px] rounded-md bg-Blue2-700 dark:bg-dark-secondary2 flex items-center justify-center text-white text-[8px] font-medium">
        {initials}
      </span>
      {user.name}
    </p>
  );
};

export const getFormatedRespondents = (respondents: Respondents[]) => {
  /*for (let i = 0; i < 50; i++) {
    respondents.push({
      userId: `${i}`,
      name: `user_${i}`,
    });
  }*/
  const elms: Array<ReactElement> = [];
  const respondentChunks = chunk(respondents, 10);

  respondentChunks.forEach((users, i) => {
    elms.push(
      <div
        className="grid gap-2 content-start border-r border-Gray-300 dark:border-Gray-800 py-2 w-max last:border-none"
        key={`chunk-${i}`}
      >
        {users.map((user) => (
          <RespondentItem key={user.userId} user={user} />
        ))}
      </div>,
    );
  });

  if (elms.length < 4) {
    const blank = 4 - elms.length;
    for (let j = 0; j < blank; j++) {
      elms.push(<div className="grid gap-2" key={`blank-${j}`}></div>);
    }
  }
  return elms;
};

export const publishPollResultByChat = async (
  pollDataWithOption: PollDataWithOption,
) => {
  const conn = getNatsConn();
  // Map over the options to create a list of results.
  const formattedOptions = Object.values(pollDataWithOption.options).map(
    (option) => (
      <li key={option.id}>{`${option.text} (${option.respondents.length})`}</li>
    ),
  );

  const elm = ReactDOMServer.renderToString(
    // Using more semantic HTML for better structure and readability in chat.
    <div style={{ padding: '5px' }}>
      <strong style={{ display: 'block', marginBottom: '4px' }}>
        {pollDataWithOption.question}
      </strong>
      <p style={{ margin: '2px 0' }}>
        {i18n.t('polls.total-responses', {
          count: pollDataWithOption.totalRespondents,
        })}
      </p>
      <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
        {formattedOptions}
      </ul>
    </div>,
  );
  if (conn) {
    await conn.sendChatMsg('public', elm);
  }
};
