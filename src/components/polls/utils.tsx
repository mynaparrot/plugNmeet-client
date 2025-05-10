import React from 'react';
import { chunk } from 'es-toolkit';
import ReactDOMServer from 'react-dom/server';

import { getNatsConn } from '../../helpers/nats';
import i18n from '../../helpers/i18n';

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

export const getFormatedRespondents = (respondents: Respondents[]) => {
  /*for (let i = 0; i < 50; i++) {
    respondents.push({
      userId: `${i}`,
      name: `user_${i}`,
    });
  }*/
  for (let i = 0; i < 35; i++) {
    respondents.push({
      userId: `${i}`,
      name: `user_${i}`,
    });
  }
  const elms: Array<React.JSX.Element> = [];
  const ck = chunk(respondents, 10);
  for (let i = 0, len = ck.length; i < len; i++) {
    const nameElms: Array<React.JSX.Element> = [];
    const users = ck[i];

    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const parts = user.name.trim().split(/\s+/);
      const firstNameInitial = parts[0]?.[0] || '';
      const lastNameInitial = parts[parts.length - 1]?.[0] || '';
      const initials = `${firstNameInitial}${lastNameInitial}`.toUpperCase();
      nameElms.push(
        <p
          className="text-xs w-[156.5px] font-medium text-Gray-800 flex items-center gap-1 px-[14px]"
          key={user.userId}
        >
          <span className="w-[18px] h-[18px] rounded-md bg-Blue2-700 flex items-center justify-center text-white text-[8px] font-medium">
            {initials}
          </span>
          {user.name}
        </p>,
      );
    }
    elms.push(
      <div
        className="grid gap-2 content-start border-r border-Gray-300 py-2 w-max last:border-none"
        key={i}
      >
        {nameElms}
      </div>,
    );
  }
  if (elms.length < 4) {
    const blank = 4 - elms.length;
    for (let j = 0; j < blank; j++) {
      elms.push(<div className="grid gap-2" key={j}></div>);
    }
  }
  return elms;
};

export const publishPollResultByChat = async (
  pollDataWithOption: PollDataWithOption,
) => {
  const conn = getNatsConn();

  const formatOptions = () => {
    const elms: Array<React.JSX.Element> = [];
    for (const key in pollDataWithOption.options) {
      const o = pollDataWithOption.options[key];
      elms.push(<p key={o.id}>{`${o.text} (${o.respondents.length})`}</p>);
    }
    return elms;
  };

  const totalRes: any = pollDataWithOption.totalRespondents;
  const elm = ReactDOMServer.renderToString(
    <>
      <p>{pollDataWithOption.question}</p>
      <p>
        {i18n.t('polls.total-responses', {
          count: totalRes,
        })}
      </p>
      {formatOptions()}
    </>,
  );
  if (conn) {
    await conn.sendChatMsg('public', elm);
  }
};
