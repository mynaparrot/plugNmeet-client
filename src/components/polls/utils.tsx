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
  allRespondents: string[];
}

interface PollDataOption {
  id: number;
  text: string;
  responsesPercentage: number;
  respondents: string[];
}

export const getFormatedRespondents = (respondents: string[]) => {
  // for (let i = 0; i < 50; i++) {
  //   respondents.push(`user_${i}`);
  // }
  const elms: Array<React.JSX.Element> = [];
  const ck = chunk(respondents, 10);
  for (let i = 0, len = ck.length; i < len; i++) {
    const nameElms: Array<React.JSX.Element> = [];
    const users = ck[i];

    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      const parts = user.trim().split(/\s+/);
      const firstNameInitial = parts[0]?.[0] || '';
      const lastNameInitial = parts[parts.length - 1]?.[0] || '';
      const initials = `${firstNameInitial}${lastNameInitial}`.toUpperCase();
      nameElms.push(
        <>
          <p
            className="text-xs font-medium text-Gray-800 w-max flex items-center gap-1 px-[14px]"
            key={initials + '_' + i}
          >
            <span className="w-[18px] h-[18px] rounded-md bg-Blue2-700 flex items-center justify-center text-white text-[8px] font-medium">
              {initials}
            </span>
            {user}
          </p>
        </>,
      );
    }
    elms.push(<div>{nameElms}</div>);
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
